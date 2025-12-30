/**
 * Test script to verify the API key functionality with the provided Gemini API key
 */
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = 'AIzaSyAPvy2cUeayGzM1TO9dY_aivrd_DcC1B-Q';

async function testGeminiAPI() {
  try {
    console.log('Testing Gemini API key...');
    
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    console.log('Making a test request...');
    const result = await model.generateContent('Hello, this is a test to verify the API key works.');
    const response = await result.response;
    const text = response.text();

    console.log('✅ API key is valid!');
    console.log('Response:', text);
    
    return true;
  } catch (error) {
    console.error('❌ API key validation failed:', error.message);
    return false;
  }
}

// Run the test
testGeminiAPI();