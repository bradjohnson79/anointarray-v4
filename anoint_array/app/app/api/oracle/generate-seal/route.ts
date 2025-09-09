
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

const AI_CONFIG_PATH = path.join(process.cwd(), 'data', 'ai-config.json');

interface UserDetails {
  fullName: string;
  birthDate: {
    day: number;
    month: number;
    year: number;
  };
  birthTime: {
    hour: number;
    minute: number;
  };
  placeOfBirth: string;
}

interface SealConfiguration {
  centralDesign: string;
  category: string;
  subCategory: string;
}

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
}

async function loadAIConfiguration(): Promise<AIConfiguration | null> {
  try {
    const configData = await fs.readFile(AI_CONFIG_PATH, 'utf-8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('Failed to load AI configuration:', error);
    return null;
  }
}

async function getUploadedFiles() {
  const AI_RESOURCES_DIR = path.join(process.cwd(), 'data', 'ai-resources');
  const CSV_DIR = path.join(AI_RESOURCES_DIR, 'csv');
  const TEMPLATE_DIR = path.join(AI_RESOURCES_DIR, 'templates');

  try {
    const csvFiles = await fs.readdir(CSV_DIR).catch(() => []);
    const templateFiles = await fs.readdir(TEMPLATE_DIR).catch(() => []);
    
    // Read CSV file contents
    const csvData: { [key: string]: string } = {};
    for (const csvFile of csvFiles) {
      const filePath = path.join(CSV_DIR, csvFile);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        csvData[csvFile] = content;
      } catch (error) {
        console.error(`Failed to read CSV file ${csvFile}:`, error);
      }
    }

    return {
      csvFiles,
      templateFiles,
      csvData,
      csvDir: CSV_DIR,
      templateDir: TEMPLATE_DIR
    };
  } catch (error) {
    console.error('Failed to get uploaded files:', error);
    return {
      csvFiles: [],
      templateFiles: [],
      csvData: {},
      csvDir: CSV_DIR,
      templateDir: TEMPLATE_DIR
    };
  }
}

async function callChatGPTDispatcher(
  userDetails: UserDetails,
  sealConfig: SealConfiguration,
  aiConfig: AIConfiguration,
  uploadedFiles: any
): Promise<any> {
  
  // Prepare CSV data for the prompt
  let csvDataSection = '';
  if (Object.keys(uploadedFiles.csvData).length > 0) {
    csvDataSection = '\nAvailable CSV Data Files:\n';
    for (const [fileName, content] of Object.entries(uploadedFiles.csvData)) {
      csvDataSection += `\n--- ${fileName} ---\n${content}\n`;
    }
  }

  // List available template files
  let templateSection = '';
  if (uploadedFiles.templateFiles.length > 0) {
    templateSection = `\nAvailable Sacred Geometry Templates:\n${uploadedFiles.templateFiles.join(', ')}\n`;
  }

  const prompt = `
${aiConfig.chatGptDispatcherPrompt}

User Details:
- Full Name: ${userDetails.fullName}
- Birth Date: ${userDetails.birthDate.month}/${userDetails.birthDate.day}/${userDetails.birthDate.year}
- Birth Time: ${userDetails.birthTime.hour}:${userDetails.birthTime.minute.toString().padStart(2, '0')}
- Place of Birth: ${userDetails.placeOfBirth}

Seal Configuration:
- Central Design: ${sealConfig.centralDesign}
- Category: ${sealConfig.category}
- Sub-Category: ${sealConfig.subCategory}

${csvDataSection}

${templateSection}

GuardRails:
${aiConfig.guardRailPrompts.antiHallucination}
${aiConfig.guardRailPrompts.taskMaintenance}

Please analyze this information using Pythagorean Numerology and Chinese Bazi (Solar calendar) to determine the appropriate elements for the seal array. Use the provided CSV data to select appropriate glyphs, numbers, and affirmations. Provide specific data for Ring 1 (numbers with colors and positions), Ring 2 (glyphs with colors and positions), and Ring 3 (mantras/affirmations for circular text).
`;

  const candidates = [
    aiConfig.dispatcherModel || 'gpt-5.1-mini',
    'gpt-5',
    'gpt-4.1',
    'gpt-4o',
    'gpt-4o-mini'
  ];
  let lastErr: any = null;
  for (const model of candidates) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${aiConfig.openAiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: aiConfig.chatGptDispatcherPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      });
      if (!response.ok) {
        const err = await response.text();
        lastErr = new Error(`OpenAI dispatcher error (${model}): ${response.status} ${err}`);
        continue;
      }
      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (e) {
      lastErr = e;
      continue;
    }
  }
  throw lastErr || new Error('All dispatcher model attempts failed');
}

async function callClaudeAssembler(
  chatGptInstructions: string,
  userDetails: UserDetails,
  sealConfig: SealConfiguration,
  aiConfig: AIConfiguration,
  uploadedFiles: any
): Promise<{ url: string; data: GeneratedSealData }> {
  
  // List available template files for Claude's vision
  let templateSection = '';
  if (uploadedFiles.templateFiles.length > 0) {
    templateSection = `\nAvailable Sacred Geometry Template Images:\n${uploadedFiles.templateFiles.join(', ')}\n`;
    templateSection += `Template files are located in: ${uploadedFiles.templateDir}\n`;
  }

  const prompt = `
${aiConfig.claudeAssemblerPrompt}

ChatGPT Dispatcher Instructions:
${chatGptInstructions}

User Configuration:
- Name: ${userDetails.fullName}
- Central Design: ${sealConfig.centralDesign}
- Array Purpose: ${sealConfig.category} - ${sealConfig.subCategory}

${templateSection}

GuardRails:
${aiConfig.guardRailPrompts.antiHallucination}
${aiConfig.guardRailPrompts.taskMaintenance}

Please create the seal array image based on the dispatcher's instructions, positioning all elements according to the 4-element structure (Central Circle + 3 Rings) with proper coordinate placement. Use the available template images for the central design reference.
`;

  // For now, return a placeholder response since we're not actually calling Anthropic API
  // In production, you would call the Anthropic API here
  
  // Simulated response for development
  const result = await generateMockSealArray(userDetails, sealConfig, chatGptInstructions);
  return result;
}

async function callChatGPTSummary(
  chatGptInstructions: string,
  userDetails: UserDetails,
  sealConfig: SealConfiguration,
  aiConfig: AIConfiguration,
  sealData: GeneratedSealData
): Promise<string> {
  const prompt = `
${aiConfig.summaryAiPrompt}

User Details:
- Full Name: ${userDetails.fullName}
- Birth Date: ${userDetails.birthDate.month}/${userDetails.birthDate.day}/${userDetails.birthDate.year}
- Birth Time: ${userDetails.birthTime.hour}:${userDetails.birthTime.minute.toString().padStart(2, '0')}
- Place of Birth: ${userDetails.placeOfBirth}

Seal Configuration:
- Central Design: ${sealConfig.centralDesign}
- Category: ${sealConfig.category}
- Sub-Category: ${sealConfig.subCategory}

ChatGPT Dispatcher Instructions:
${chatGptInstructions}

GuardRails:
${aiConfig.guardRailPrompts.antiHallucination}
${aiConfig.guardRailPrompts.taskMaintenance}

Actual Assembled Seal Data (JSON):
${JSON.stringify(sealData)}

Please provide a brief, engaging summary of this seal array describing the healing effects and elements in each ring (Ring 1: Numbers, Ring 2: Glyphs, Ring 3: Affirmations/Mantras) based on the assembled data above. Do not include any elements that are not present in that JSON. If the affirmation/mantra is a Gayatri, do NOT include the word "Gayatri" anywhere — output only the mantra text itself.

At the end, include the following three lines exactly (use the provided affirmation/mantra; if it is clearly English, skip Pronunciation):
- Affirmation: <text>
- Pronunciation of Affirmation: <phonetic, if Sanskrit or non‑English; otherwise omit this line>
- Definition of Affirmation: <one‑sentence meaning/translation>
`;

  const candidates = [
    aiConfig.summaryModel || 'gpt-5.1-mini',
    'gpt-5',
    'gpt-4.1',
    'gpt-4o',
    'gpt-4o-mini'
  ];
  let lastErr: any = null;
  for (const model of candidates) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${aiConfig.openAiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: aiConfig.summaryAiPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });
      if (!response.ok) {
        const err = await response.text();
        lastErr = new Error(`OpenAI summary error (${model}): ${response.status} ${err}`);
        continue;
      }
      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (e) {
      lastErr = e;
      continue;
    }
  }
  throw lastErr || new Error('All summary model attempts failed');
}

// 24-point directional coordinate system (like a clock)
const COORDINATE_POSITIONS = [
  { angle: 0, position: '12:00' },    { angle: 15, position: '12:30' },
  { angle: 30, position: '1:00' },    { angle: 45, position: '1:30' },
  { angle: 60, position: '2:00' },    { angle: 75, position: '2:30' },
  { angle: 90, position: '3:00' },    { angle: 105, position: '3:30' },
  { angle: 120, position: '4:00' },   { angle: 135, position: '4:30' },
  { angle: 150, position: '5:00' },   { angle: 165, position: '5:30' },
  { angle: 180, position: '6:00' },   { angle: 195, position: '6:30' },
  { angle: 210, position: '7:00' },   { angle: 225, position: '7:30' },
  { angle: 240, position: '8:00' },   { angle: 255, position: '8:30' },
  { angle: 270, position: '9:00' },   { angle: 285, position: '9:30' },
  { angle: 300, position: '10:00' },  { angle: 315, position: '10:30' },
  { angle: 330, position: '11:00' },  { angle: 345, position: '11:30' }
];

interface SealToken {
  position: string;
  angle: number;
  color: string;
  content: string | number;
  type: 'number' | 'glyph';
}

interface GeneratedSealData {
  centralDesign: string;
  ring1Tokens: SealToken[];
  ring2Tokens: SealToken[];
  ring3Affirmation: string;
  userConfig: {
    name: string;
    category: string;
    subCategory: string;
  };
}

async function generateMockSealArray(
  userDetails: UserDetails,
  sealConfig: SealConfiguration,
  instructions: string
 ): Promise<{ url: string; data: GeneratedSealData }> {
  // Parse the ChatGPT instructions to extract token placement data
  const sealData = await generateSealTokens(userDetails, sealConfig, instructions);
  
  // Create a structured data URL that contains the seal configuration
  const timestamp = Date.now();
  const fileName = `seal_${userDetails.fullName.replace(/\s+/g, '_')}_${sealConfig.centralDesign}_${timestamp}.json`;
  
  // Save the generated seal data for the frontend to use
  const recordsDir = path.join(process.cwd(), 'data', 'generated-seals');
  try {
    await fs.access(recordsDir);
  } catch {
    await fs.mkdir(recordsDir, { recursive: true });
  }
  
  const sealDataFile = path.join(recordsDir, fileName);
  await fs.writeFile(sealDataFile, JSON.stringify(sealData, null, 2));
  
  // Return the data URL for frontend processing
  return { url: `/api/files/generated-seals/${fileName}`, data: sealData };
}

async function generateSealTokens(
  userDetails: UserDetails,
  sealConfig: SealConfiguration,
  instructions: string
): Promise<GeneratedSealData> {
  // Load CSV data for token generation
  const csvData = await getUploadedFiles();
  
  // Parse available colors, numbers, and glyphs
  const availableColors = parseColorsFromCSV(csvData.csvData['colors.csv'] || '');
  const availableNumbers = parseNumbersFromCSV(csvData.csvData['numbers.csv'] || '');
  const availableGlyphs = parseGlyphsFromCSV(csvData.csvData['glyphs.csv'] || '');
  
  // Generate Ring 1 tokens (Sacred Numbers) — evenly distributed around 24 ticks
  const ring1Tokens: SealToken[] = [];
  const usedRing1Positions = new Set<string>();
  // Sample generation - in production, this would be based on numerology calculations
  const selectedNumbers = [7, 22, 33, 18, 13, 26, 44, 77, 8, 555];
  const selectedRing1Colors = ['BLUE', 'ORANGE', 'GREEN', 'PURPLE', 'YELLOW'];
  const n1 = Math.min(10, selectedNumbers.length);
  const total = COORDINATE_POSITIONS.length; // 24
  for (let i = 0; i < n1; i++) {
    // Use proportional mapping to cover entire circle, then round to nearest tick
    const idx = Math.round((i * total) / n1) % total;
    const position = COORDINATE_POSITIONS[idx];
    const key = position.position;
    if (usedRing1Positions.has(key)) continue;
    ring1Tokens.push({
      position: key,
      angle: position.angle,
      color: selectedRing1Colors[i % selectedRing1Colors.length],
      content: selectedNumbers[i],
      type: 'number'
    });
    usedRing1Positions.add(key);
  }
  
  // Generate Ring 2 tokens (Mystical Glyphs) — interleave between Ring 1 tokens
  const ring2Tokens: SealToken[] = [];
  const usedRing2Positions = new Set<string>();
  const selectedGlyphs = [
    'om.png', 'ankh.png', 'lotus.png', 'eye-of-horus.png', 
    'heart-chakra.png', 'taurus.png', 'leo.png', 'scorpio.png',
    'root-chakra.png', 'crown-center.png'
  ];
  const selectedRing2Colors = ['AQUA', 'RED', 'GOLD', 'INDIGO', 'GREEN'];
  const n2 = Math.min(10, selectedGlyphs.length);
  for (let i = 0; i < n2; i++) {
    // Offset by half a slice to sit between Ring 1 placements
    const raw = (i + 0.5) * (total / n2);
    const idx = Math.round(raw) % total;
    const position = COORDINATE_POSITIONS[idx];
    const key = position.position;
    if (usedRing2Positions.has(key) || usedRing1Positions.has(key)) continue;
    ring2Tokens.push({
      position: key,
      angle: position.angle,
      color: selectedRing2Colors[i % selectedRing2Colors.length],
      content: selectedGlyphs[i],
      type: 'glyph'
    });
    usedRing2Positions.add(key);
  }
  
  // Generate Ring 3 affirmation based on category/subcategory
  const ring3Affirmation = generateAffirmationText(sealConfig.category, sealConfig.subCategory);
  
  return {
    centralDesign: sealConfig.centralDesign,
    ring1Tokens,
    ring2Tokens,
    ring3Affirmation,
    userConfig: {
      name: userDetails.fullName,
      category: sealConfig.category,
      subCategory: sealConfig.subCategory
    }
  };
}

function parseColorsFromCSV(csvContent: string): string[] {
  const lines = csvContent.split('\n').slice(1); // Skip header
  return lines.map(line => line.split(',')[0]).filter(color => color.trim());
}

function parseNumbersFromCSV(csvContent: string): number[] {
  const lines = csvContent.split('\n').slice(1); // Skip header
  return lines.map(line => parseInt(line.split(',')[0])).filter(num => !isNaN(num));
}

function parseGlyphsFromCSV(csvContent: string): string[] {
  const lines = csvContent.split('\n').slice(1); // Skip header
  return lines.map(line => line.split(',')[0]).filter(filename => filename.trim());
}

function generateAffirmationText(category: string, subCategory: string): string {
  // Weighted selection: 70% classical mantras (Sanskrit/Latin), 30% English affirmations
  const english: { [key: string]: string[] } = {
    'Healing & Detoxification': ['I am pure healing energy', 'Every cell radiates vitality'],
    'Mind & Memory': ['My mind is clear and focused', 'Wisdom flows through me'],
    'Dreams & Subconscious': ['I receive guidance in dreams', 'My subconscious is luminous'],
    'Energy & Protection': ['I am protected by divine light', 'A shield of light surrounds me'],
    'Chakra & Spiritual Growth': ['My chakras align with cosmic energy', 'I rise in truth and grace'],
    'Environmental Enhancement': ['This space is consecrated and pure', 'Sacred energy flows here'],
    'Body Systems & Organs': ['My body heals and regenerates perfectly', 'Harmony pervades my body'],
    'Other Specialized Arrays': ['Divine energy flows through me', 'I am one with divine energy']
  };
  const mantras = [
    // Sanskrit (transliterated)
    'Om Mani Padme Hum',
    'So Hum',
    'Om Shanti Shanti Shanti',
    'Lokah Samastah Sukhino Bhavantu',
    'Om Namah Shivaya',
    'Om Bhur Bhuvah Svah',
    // Latin
    'Lux in Tenebris',
    'Vita Amor Veritas',
    'Fiat Lux',
    'Pax et Bonum'
  ];
  const rnd = Math.random();
  if (rnd < 0.7) {
    // Choose a mantra
    return mantras[Math.floor(Math.random() * mantras.length)];
  }
  // Choose an English affirmation from the category
  const list = english[category] || english['Other Specialized Arrays'];
  return list[Math.floor(Math.random() * list.length)];
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userDetails, sealConfig, userId } = await request.json();

    // Load AI configuration
    const aiConfig = await loadAIConfiguration();
    if (!aiConfig || !aiConfig.isConfigured) {
      return NextResponse.json({ 
        error: 'AI system not configured. Please contact administrator.' 
      }, { status: 500 });
    }

    try {
      // Load uploaded resource files
      console.log('Loading uploaded AI resource files...');
      const uploadedFiles = await getUploadedFiles();
      
      // Step 1: Call ChatGPT Dispatcher to analyze user data
      console.log('Calling ChatGPT Dispatcher...');
      const chatGptInstructions = await callChatGPTDispatcher(
        userDetails, 
        sealConfig, 
        aiConfig, 
        uploadedFiles
      );
      
      // Step 2: Call Claude Assembler to create the seal array
      console.log('Calling Claude Assembler...');
      const { url: sealImageUrl, data: assembledSeal } = await callClaudeAssembler(
        chatGptInstructions, 
        userDetails, 
        sealConfig, 
        aiConfig,
        uploadedFiles
      );

      // Step 3: Generate summary using ChatGPT-5
      console.log('Generating seal array summary...');
      const summary = await callChatGPTSummary(
        chatGptInstructions,
        userDetails,
        sealConfig,
        aiConfig,
        assembledSeal
      );

      // Step 4: Save generation record (optional)
      const generationRecord = {
        userId,
        userDetails,
        sealConfig,
        chatGptInstructions,
        sealData: assembledSeal,
        summary,
        sealImageUrl,
        timestamp: new Date().toISOString()
      };

      // Save to file system for now (in production, you might use a database)
      const recordsDir = path.join(process.cwd(), 'data', 'seal-generations');
      try {
        await fs.access(recordsDir);
      } catch {
        await fs.mkdir(recordsDir, { recursive: true });
      }
      
      const recordFile = path.join(recordsDir, `${userId}_${Date.now()}.json`);
      await fs.writeFile(recordFile, JSON.stringify(generationRecord, null, 2));

      return NextResponse.json({
        success: true,
        sealImageUrl,
        sealData: assembledSeal,
        summary,
        instructions: chatGptInstructions,
        message: 'ANOINT Seal Array generated successfully'
      });

    } catch (aiError) {
      console.error('AI Generation error:', aiError);
      return NextResponse.json({
        error: 'Failed to generate seal array. Please try again.',
        details: aiError instanceof Error ? aiError.message : 'Unknown AI error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Seal generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error during seal generation' },
      { status: 500 }
    );
  }
}
