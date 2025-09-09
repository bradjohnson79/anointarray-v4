
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

const AI_CONFIG_PATH = path.join(process.cwd(), 'data', 'ai-config.json');

interface AIConfiguration {
  chatGptDispatcherPrompt: string;
  claudeAssemblerPrompt: string;
  summaryAiPrompt: string;
  guardRailPrompts: {
    antiHallucination: string;
    taskMaintenance: string;
  };
  openAiApiKey: string;
  anthropicApiKey: string;
  dispatcherModel?: string;
  summaryModel?: string;
  isConfigured: boolean;
  lastUpdated: string;
}

// Ensure data directory exists
async function ensureDataDirectory() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const aiConfig: AIConfiguration = await request.json();
    
    // Only use environment API keys if no keys are provided in the request
    // If keys are provided as '***', it means they're masked - load from existing config or environment
    if (aiConfig.openAiApiKey === '***' || !aiConfig.openAiApiKey) {
      try {
        const existingConfigData = await fs.readFile(AI_CONFIG_PATH, 'utf-8');
        const existingConfig = JSON.parse(existingConfigData);
        aiConfig.openAiApiKey = existingConfig.openAiApiKey || process.env.OPENAI_API_KEY || '';
      } catch (error) {
        aiConfig.openAiApiKey = process.env.OPENAI_API_KEY || '';
      }
    }
    
    if (aiConfig.anthropicApiKey === '***' || !aiConfig.anthropicApiKey) {
      try {
        const existingConfigData = await fs.readFile(AI_CONFIG_PATH, 'utf-8');
        const existingConfig = JSON.parse(existingConfigData);
        aiConfig.anthropicApiKey = existingConfig.anthropicApiKey || process.env.ANTHROPIC_API_KEY || '';
      } catch (error) {
        aiConfig.anthropicApiKey = process.env.ANTHROPIC_API_KEY || '';
      }
    }
    
    // Add metadata
    aiConfig.lastUpdated = new Date().toISOString();
    aiConfig.isConfigured = !!(
      aiConfig.chatGptDispatcherPrompt &&
      aiConfig.claudeAssemblerPrompt &&
      aiConfig.summaryAiPrompt &&
      aiConfig.openAiApiKey &&
      aiConfig.anthropicApiKey
    );

    // Ensure directory exists
    await ensureDataDirectory();

    // Save to file
    await fs.writeFile(AI_CONFIG_PATH, JSON.stringify(aiConfig, null, 2));

    return NextResponse.json({ 
      success: true, 
      isConfigured: aiConfig.isConfigured,
      message: 'AI configuration saved successfully' 
    });

  } catch (error) {
    console.error('AI Config save error:', error);
    return NextResponse.json(
      { error: 'Failed to save AI configuration' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const configData = await fs.readFile(AI_CONFIG_PATH, 'utf-8');
      const aiConfig = JSON.parse(configData);
      
      // Load API keys from environment if not set in config
      const openAiApiKey = aiConfig.openAiApiKey || process.env.OPENAI_API_KEY || '';
      const anthropicApiKey = aiConfig.anthropicApiKey || process.env.ANTHROPIC_API_KEY || '';
      
      return NextResponse.json({
        ...aiConfig,
        openAiApiKey: openAiApiKey ? '***' : '',
        anthropicApiKey: anthropicApiKey ? '***' : '',
        hasOpenAiKey: !!openAiApiKey,
        hasAnthropicKey: !!anthropicApiKey
      });
    } catch (error) {
      // Return default config with environment API keys if file doesn't exist
      const openAiApiKey = process.env.OPENAI_API_KEY || '';
      const anthropicApiKey = process.env.ANTHROPIC_API_KEY || '';
      
      return NextResponse.json({
        chatGptDispatcherPrompt: '',
        claudeAssemblerPrompt: '',
        summaryAiPrompt: '',
        guardRailPrompts: {
          antiHallucination: '',
          taskMaintenance: ''
        },
        openAiApiKey: openAiApiKey ? '***' : '',
        anthropicApiKey: anthropicApiKey ? '***' : '',
        hasOpenAiKey: !!openAiApiKey,
        hasAnthropicKey: !!anthropicApiKey,
        isConfigured: false,
        lastUpdated: null
      });
    }

  } catch (error) {
    console.error('AI Config get error:', error);
    return NextResponse.json(
      { error: 'Failed to load AI configuration' },
      { status: 500 }
    );
  }
}
