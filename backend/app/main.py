from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import json
import requests
import subprocess
import asyncio
import aiohttp
from . import models, database
from .database import engine, get_db

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Enable WebSocket CORS
@app.middleware("http")
async def add_websocket_cors_headers(request, call_next):
    response = await call_next(request)
    if request.url.path == "/ws":
        response.headers["Access-Control-Allow-Origin"] = request.headers.get("origin", "http://localhost:5173")
    return response

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.post("/api/exit")
async def exit_to_desktop():
    """Exit the custom desktop and return to Ubuntu desktop"""
    try:
        # Kill the current window and return to default desktop
        subprocess.run(['pkill', '-f', 'electron'])
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/models")
async def list_models():
    """List all available Ollama models"""
    try:
        response = requests.get("http://localhost:11434/api/tags")
        data = response.json()
        models = [{"name": model["name"], "modified_at": model.get("modified_at", "")} 
                 for model in data.get("models", [])]
        
        if not models:
            return {
                "status": "no_models",
                "message": "No Ollama models are installed",
                "models": []
            }
        
        model_list = [{"name": model.get("name"), "modified_at": model.get("modified_at")} 
                     for model in models]
        
        if len(model_list) == 1:
            return {
                "status": "single_model",
                "message": f"Using model: {model_list[0]['name']}",
                "models": model_list
            }
        
        return {
            "status": "multiple_models",
            "message": "Please select a model to use",
            "models": model_list
        }
    except Exception as e:
        if "connection refused" in str(e).lower():
            return {
                "status": "error",
                "message": "Ollama service is not running. Please start Ollama first.",
                "models": []
            }
        return {
            "status": "error",
            "message": str(e),
            "models": []
        }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for chat interactions"""
    connection_active = True
    try:
        await websocket.accept()
        print("WebSocket connection accepted")
        print("connection open")
        
        while connection_active:
            try:
                # Receive message from client
                data = await websocket.receive_text()
                message = json.loads(data)
                print(f"Received message: {message}")
                
                # Connect to Ollama API
                print(f"Processing message with model: {message.get('model', 'llama2:latest')}")
                print("Connecting to Ollama API...")
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        "http://localhost:11434/api/chat",
                        json={
                            "model": message.get('model', 'llama2:latest'),
                            "messages": [{"role": "user", "content": message["content"]}],
                            "stream": True,
                            "options": {
                                "temperature": 0.7,
                                "num_predict": 100
                            }
                        },
                        timeout=aiohttp.ClientTimeout(total=300)
                    ) as response:
                        print(f"Ollama API response status: {response.status}")
                        if response.status != 200:
                            await websocket.send_text(json.dumps({
                                "type": "error",
                                "content": f"Ollama API error: {response.status}"
                            }))
                            continue
                        
                        # Process streaming response
                        current_block = []
                        in_code_block = False
                        
                        async for line in response.content:
                            if not line:
                                continue
                            
                            try:
                                chunk = json.loads(line.decode('utf-8'))
                                
                                if "error" in chunk:
                                    await websocket.send_text(json.dumps({
                                        "type": "error",
                                        "content": chunk["error"]
                                    }))
                                    break
                                
                                if "message" in chunk:
                                    content = chunk["message"].get("content", "")
                                    if not content:
                                        continue
                                    
                                    # Handle code blocks
                                    if "```" in content:
                                        if not in_code_block:
                                            in_code_block = True
                                            current_block = [content]
                                        else:
                                            in_code_block = False
                                            current_block.append(content)
                                            await websocket.send_text(json.dumps({
                                                "type": "stream",
                                                "content": "".join(current_block)
                                            }))
                                            current_block = []
                                    else:
                                        if in_code_block:
                                            current_block.append(content)
                                        else:
                                            await websocket.send_text(json.dumps({
                                                "type": "stream",
                                                "content": content
                                            }))
                                
                                if chunk.get("done", False):
                                    if current_block:
                                        await websocket.send_text(json.dumps({
                                            "type": "stream",
                                            "content": "".join(current_block)
                                        }))
                                    await websocket.send_text(json.dumps({"type": "end"}))
                                    connection_active = False
                                    break
                                    
                            except json.JSONDecodeError as e:
                                print(f"JSON decode error: {e}")
                                continue
                        
            except json.JSONDecodeError as e:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "content": "Invalid message format"
                }))
            except Exception as e:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "content": str(e)
                }))
                
    except WebSocketDisconnect:
        print("WebSocket disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        try:
            await websocket.close()
        except:
            pass

@app.get("/api/conversations")
async def get_conversations(db: Session = Depends(get_db)):
    """Get all conversations with their messages"""
    conversations = db.query(models.Conversation).all()
    result = []
    for conv in conversations:
        messages = db.query(models.Message).filter(
            models.Message.conversation_id == conv.id
        ).order_by(models.Message.created_at).all()
        result.append({
            "id": conv.id,
            "title": conv.title,
            "summary": conv.summary,
            "messages": [{"role": msg.role, "content": msg.content} for msg in messages]
        })
    return result

@app.post("/api/conversations")
async def create_conversation(conversation: dict, db: Session = Depends(get_db)):
    """Create a new conversation with messages and generate AI summary"""
    # First, save the conversation
    db_conversation = models.Conversation(
        title=conversation["title"],
        summary="Generating summary..." # Temporary summary
    )
    db.add(db_conversation)
    db.commit()
    db.refresh(db_conversation)
    
    # Save all messages
    for msg in conversation["messages"]:
        db_message = models.Message(
            conversation_id=db_conversation.id,
            role=msg["role"],
            content=msg["content"]
        )
        db.add(db_message)
    db.commit()

    # Generate summary using Ollama
    try:
        messages_text = "\n".join([
            f"{msg['role']}: {msg['content']}" 
            for msg in conversation["messages"]
            if msg["role"] in ["user", "assistant"]
        ])
        
        prompt = f"""Please create a very brief summary (under 50 characters) that captures what the user wanted to achieve in this conversation. Focus only on the user's main goal or request. The summary should start with a verb and be action-oriented.

Example good summaries:
- "Create factorial function with recursion"
- "Debug Python memory leak"
- "Setup Docker environment"

Conversation:
{messages_text}

Summary:"""

        response = requests.post(
            "http://localhost:11434/api/chat",
            json={
                "model": "llama2",
                "messages": [{"role": "user", "content": prompt}],
                "stream": False
            }
        )
        data = response.json()
        summary = data.get("message", {}).get("content", "").strip()
        if len(summary) > 50:
            summary = summary[:47] + "..."
            
        # Update the summary
        db_conversation.summary = summary
        db.commit()
    except Exception as e:
        print(f"Error generating summary: {e}")
        # Extract first 50 chars of user's first message as fallback summary
        try:
            first_user_msg = next(msg["content"] for msg in conversation["messages"] if msg["role"] == "user")
            summary = first_user_msg[:47] + "..." if len(first_user_msg) > 50 else first_user_msg
            db_conversation.summary = summary
        except:
            db_conversation.summary = "Chat with AI Assistant"
        db.commit()

    return {
        "id": db_conversation.id,
        "title": db_conversation.title,
        "summary": db_conversation.summary,
        "messages": conversation["messages"]
    }
