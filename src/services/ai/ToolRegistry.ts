import { HealthcareCache } from '../healthcare/HealthcareCache';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
  safetyClassification: 'READ_ONLY' | 'ACTION_REQUIRING_CONFIRMATION';
}

export interface ToolRequest {
  tool: string;
  arguments: Record<string, any>;
}

export interface ToolResult {
  tool: string;
  success: boolean;
  data?: any;
  error?: string;
  requiresConfirmation?: boolean;
}

class ToolRegistryService {
  public tools: Record<string, ToolDefinition> = {
    findNearbyHospital: {
      name: 'findNearbyHospital',
      description: 'Finds the nearest cached hospital to the user',
      parameters: {
        type: 'object',
        properties: {
          lat: { type: 'number' },
          lon: { type: 'number' },
        },
        required: ['lat', 'lon'],
      },
      safetyClassification: 'READ_ONLY',
    },
    triggerSOS: {
      name: 'triggerSOS',
      description: 'Triggers the emergency SOS protocol',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
      safetyClassification: 'ACTION_REQUIRING_CONFIRMATION',
    },
  };

  /**
   * Validates a tool request against the defined schema.
   */
  public validateRequest(request: any): request is ToolRequest {
    if (!request || typeof request !== 'object') return false;
    if (typeof request.tool !== 'string') return false;
    if (typeof request.arguments !== 'object') return false;

    const def = this.tools[request.tool];
    if (!def) return false;

    // Basic required field validation
    for (const req of def.parameters.required) {
      if (request.arguments[req] === undefined) return false;
    }
    return true;
  }

  /**
   * Executes the validated tool request deterministically.
   */
  public async executeTool(request: ToolRequest): Promise<ToolResult> {
    const def = this.tools[request.tool];
    if (!def) {
      return { tool: request.tool, success: false, error: 'Unknown tool' };
    }

    if (def.safetyClassification === 'ACTION_REQUIRING_CONFIRMATION') {
      return {
        tool: request.tool,
        success: true,
        requiresConfirmation: true,
        data: 'ACTION PENDING CONFIRMATION BY USER',
      };
    }

    try {
      switch (request.tool) {
        case 'findNearbyHospital': {
          const { lat, lon } = request.arguments;
          const facilities = HealthcareCache.getNearestOffline(lat, lon);
          if (facilities.length > 0) {
            return { tool: request.tool, success: true, data: facilities[0] };
          } else {
            return { tool: request.tool, success: false, error: 'No nearby facilities cached' };
          }
        }
        default:
          return { tool: request.tool, success: false, error: 'Tool not implemented' };
      }
    } catch (e: any) {
      return { tool: request.tool, success: false, error: e.message || 'Tool execution failed' };
    }
  }
}

export const ToolRegistry = new ToolRegistryService();
