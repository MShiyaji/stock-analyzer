
import React from 'react';
import { AgentStep, AgentStatus } from '../types';
import { CheckCircle, Circle, Loader2, AlertCircle } from 'lucide-react';

interface Props {
  steps: AgentStep[];
}

const AgentStatusList: React.FC<Props> = ({ steps }) => {
  return (
    <div className="space-y-4 bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl">
      <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-4">Orchestration Pipeline</h3>
      {steps.map((step) => (
        <div key={step.id} className="flex items-start gap-4">
          <div className="mt-1">
            {step.status === AgentStatus.COMPLETED && (
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            )}
            {step.status === AgentStatus.RUNNING && (
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            )}
            {step.status === AgentStatus.IDLE && (
              <Circle className="w-5 h-5 text-zinc-700" />
            )}
            {step.status === AgentStatus.ERROR && (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
          </div>
          <div className="flex-1">
            <h4 className={`text-sm font-semibold ${step.status === AgentStatus.RUNNING ? 'text-blue-400' : 'text-zinc-200'}`}>
              {step.name}
            </h4>
            <p className="text-xs text-zinc-500 mt-0.5">{step.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AgentStatusList;
