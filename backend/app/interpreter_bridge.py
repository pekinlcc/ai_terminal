import interpreter
import asyncio
import json
import sys
import os
from typing import Optional, Callable

class InterpreterBridge:
    def __init__(self, model: str, callback: Optional[Callable[[str], None]] = None):
        self.model = model
        self.callback = callback
        
        # Configure interpreter
        interpreter.model = model
        interpreter.api_base = "http://localhost:11434/api"
        interpreter.local = True
        interpreter.auto_run = True
        interpreter.stream = True
        
    async def stream_callback(self, chunk: str):
        if self.callback and chunk:
            await self.callback(json.dumps({
                "type": "stream",
                "content": chunk
            }))
    
    async def chat(self, message: str):
        try:
            interpreter.callback = self.stream_callback
            response = await interpreter.chat(message)
            if self.callback:
                await self.callback(json.dumps({"type": "end"}))
            return response
        except Exception as e:
            if self.callback:
                await self.callback(json.dumps({
                    "type": "error",
                    "content": str(e)
                }))
            return None

if __name__ == "__main__":
    # This allows the script to be run as a standalone process
    # that communicates via stdin/stdout
    async def main():
        while True:
            try:
                line = sys.stdin.readline()
                if not line:
                    break
                    
                data = json.loads(line)
                command = data.get("command")
                
                if command == "init":
                    interpreter.model = data.get("model", "llama2")
                    print(json.dumps({"type": "ready"}))
                    sys.stdout.flush()
                elif command == "chat":
                    bridge = InterpreterBridge(
                        model=data.get("model", "llama2"),
                        callback=lambda x: print(x, flush=True)
                    )
                    await bridge.chat(data.get("message", ""))
            except Exception as e:
                print(json.dumps({
                    "type": "error",
                    "content": str(e)
                }), flush=True)
    
    asyncio.run(main())
