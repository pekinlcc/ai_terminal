import React, { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface ModelSelectorProps {
  models: string[];
  selectedModel: string;
  onModelSelect: (model: string) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModel,
  onModelSelect,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleModelSelect = (model: string) => {
    setIsLoading(true);
    onModelSelect(model);
    // Simulate loading state
    setTimeout(() => setIsLoading(false), 500);
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedModel} onValueChange={handleModelSelect} disabled={isLoading}>
        <SelectTrigger className="w-[200px] bg-white">
          <SelectValue placeholder="Select a model">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading model...</span>
              </div>
            ) : (
              selectedModel || "Select a model"
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {models.map((model) => (
            <SelectItem 
              key={model} 
              value={model}
              className="cursor-pointer hover:bg-gray-100"
            >
              {model}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isLoading && (
        <div className="text-sm text-gray-500">
          Initializing model...
        </div>
      )}
    </div>
  );
};
