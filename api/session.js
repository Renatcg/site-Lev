/**
 * Endpoint Serverless (Vercel) para a API Realtime da OpenAI
 * Ele mantém a OPENAI_API_KEY no servidor de forma segura e 
 * retorna apenas um Ephemeral Token para o frontend iniciar o WebRTC.
 */

export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error("OPENAI_API_KEY não configurada no servidor.");
        }

        const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o-realtime-preview-2024-12-17",
                voice: "alloy", // Vozes disponíveis: alloy, ash, ballad, coral, echo, sage, shimmer, verse
                instructions: "Você é a assistente de inteligência da Lev Incorporações. Fale de maneira executiva, luxuosa, direta e acolhedora. Seu papel é auxiliar incorporadores com informações sobre viabilidade técnica, arquitetura, jurídico e esteira de lançamento imobiliário."
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI Error: ${errorText}`);
        }

        const data = await response.json();
        
        // Retorna o token efêmero de volta ao frontend
        return res.status(200).json(data);
    } catch (error) {
        console.error("Erro na API /session:", error);
        return res.status(500).json({ error: error.message });
    }
}
