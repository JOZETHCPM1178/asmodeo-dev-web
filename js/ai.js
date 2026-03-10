// ai.js - Lógica del Chat Asmodeo TK con Gemini
import { GoogleGenAI } from "https://esm.run/@google/genai";

// CONFIGURACIÓN - Reemplaza con tu API Key o asegúrate de que esté en tu entorno
const API_KEY = "AIzaSyDXfpFOzU4fRhojl-jN9keg1Vnh3qsJXDg"; 
const genAI = new GoogleGenAI(API_KEY);

const SYSTEM_INSTRUCTION = `Eres Chat Asmodeo TK, el asistente oficial de ASMODEO DEV. 
Tu objetivo es ayudar a la comunidad con APKs Mod, Juegos, Scripts y Tutoriales.
Eres técnico, servicial y tienes un estilo hacker elegante. 
Menciona siempre que el contenido es para fines educativos.`;

let chatSession = null;

// Inicializar el chat
async function initChat() {
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash", // Usamos flash para velocidad y bajo costo
        systemInstruction: SYSTEM_INSTRUCTION 
    });
    chatSession = model.startChat({
        history: [],
        generationConfig: {
            maxOutputTokens: 1000,
        },
    });
}

// Función para enviar mensajes (la que llamará tu interfaz)
export async function sendMessageToGemini(userMessage) {
    if (!chatSession) await initChat();
    
    try {
        const result = await chatSession.sendMessage(userMessage);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error en Gemini:", error);
        return "Lo siento, hubo un error en la conexión. Intenta de nuevo.";
    }
}

// Inicializar al cargar
initChat();
