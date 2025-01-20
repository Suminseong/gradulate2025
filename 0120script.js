document.addEventListener('DOMContentLoaded', () => {
    const apiUrl = "https://api.openai.com/v1/chat/completions";
    const modelId = "ft:gpt-4o-2024-08-06:chamkkae:chamkkae-v3a:AmwkrRHc";

    const chatbox = document.getElementById('chatbox');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const apiKeyInput = document.getElementById('apiKey');

    // 전역 변수로 GPT 응답 저장
    let gptResponse = "";

    // WebSocket 연결 객체
    let socket;

    // Function to append messages to the chatbox
    function appendMessage(message, sender) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${sender}`;
        messageElement.textContent = message;
        chatbox.appendChild(messageElement);
        chatbox.scrollTop = chatbox.scrollHeight; // Auto-scroll to bottom
    }

    // Function to send user message to the GPT API
    async function sendMessage() {
        const apiKey = apiKeyInput.value.trim();
        const message = userInput.value.trim();
        if (!apiKey) {
            alert('Please enter your API Key.');
            return;
        }
        if (!message) {
            alert('Please enter a message.');
            return;
        }

        appendMessage(message, 'user'); // Show user message
        userInput.value = ''; // Clear input field

        // Prepare API payload
        const payload = {
            model: modelId,
            messages: [
                { role: "system", content: "You are a helpful chatbot." },
                { role: "user", content: message }
            ],
            max_tokens: 2700,
            temperature: 1,
            top_p: 0.8,
            frequency_penalty: 0.2,
            presence_penalty: 0.06
        };

        try {
            // Send API request using fetch
            const response = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }

            const data = await response.json();
            const botMessage = data.choices[0]?.message?.content || "Error: No response from API.";

            // 전역 변수에 GPT 응답 저장
            gptResponse = botMessage;

            // Show bot message
            appendMessage(botMessage, 'bot');

            // WebSocket을 통해 서버로 데이터 전송 (추가된 부분)
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ apiKey, gptResponse: botMessage }));
                console.log("Sent to WebSocket server:", { apiKey, gptResponse: botMessage });
            } else {
                console.warn("WebSocket is not connected.");
            }
        } catch (error) {
            appendMessage(`Error: ${error.message}`, 'bot');
        }
    }

    // WebSocket 연결 초기화 (추가된 부분)
    function connectWebSocket() {
        socket = new WebSocket("ws://localhost:5500/ws");

        socket.onopen = () => {
            console.log("WebSocket connection established.");
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log("Received from server:", data);
            } catch (error) {
                console.error("Error processing WebSocket message:", error);
            }
        };

        socket.onclose = () => {
            console.log("WebSocket connection closed.");
        };

        socket.onerror = (error) => {
            console.error("WebSocket error:", error);
        };
    }

    // Attach event listeners
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // WebSocket 연결 실행
    connectWebSocket();
});
