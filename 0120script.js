document.addEventListener('DOMContentLoaded', () => {
    const apiUrl = "https://api.openai.com/v1/chat/completions";
    const modelId = "ft:gpt-4o-2024-08-06:chamkkae:chamkkae-v3a:AmwkrRHc";

    const chatbox = document.getElementById('chatbox');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const apiKeyInput = document.getElementById('apiKey');

    // 대화 세션 상태 저장 (문맥 유지용)
    const messages = [
        {
            role: "system",
            content: "사용자가 제출한 내용을 읽고 퍼소나를 생성합니다. 성별: 남자 또는 여자. 이름: 한국식으로 3글자 이름만 허용. 나이: 사용자가 원하는 연령대에 맞춰 생성. 직업: 사용자가 제시한 인터뷰 또는 상황조건에 맞게 생성합니다. 또는, 사용자가 원하는 직업으로 넣어도 됩니다. 취미: 가상의 인물이 가진 취미입니다. 인터뷰 주제와 꼭 관련될 필요는 없으며, MBTI나 거주지, 소득과 관련성만 있으면 됩니다. 예를 들어, 소득이 낮은데 자동차 수집, 악기 취미가 있으면 안됨. 소득: 알바/정규직/계약직, 현재 벌고 있는 연간 수입. 거주지(도/광역시~시/군/구): 대전광역시 유성구, 경상남도 사천시 등 대략적인 지명만 적으면 됩니다.  MBTI: 16가지 성격유형인 MBTI중 하나를 골라 집어넣은 뒤, 그에 대한 짧은 설명도 적으세요. 성격 특이사항: MBTI로 표현되지 않을 수 있는 내용들도 자유롭게 추가합니다. 가족구성: 1인가구, 연인동거, 결혼, 자녀유무, 부모동거, 조부모가정, 한부모가정, 아동보호소, 기러기가정 등등 다양한 상황들에서 선택. 언어습관: 공격적, 다혈질, 내성적, 적극적, 수비적, 말 더듬음, 소극적, 단답형, 장문형, 지역 사투리 등 주요 언어습관. 인터뷰 주제에 대한 생각: 인터뷰 주제에 대한 이해도, 흥미, 경험에 대한 이야기, 상황등을 100자 이내로 자유롭게 채웁니다. 한마디: 인터뷰 대상자가 자기소개를 하는 한 문장 대사를 출력. 언어습관을 활용."
        }
    ];

    // WebSocket 연결 객체
    let socket;

    // WebSocket 연결 초기화
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
        const userMessage = userInput.value.trim();

        if (!apiKey) {
            alert('Please enter your API Key.');
            return;
        }
        if (!userMessage) {
            alert('Please enter a message.');
            return;
        }

        // Append user's message to the UI and messages array
        appendMessage(userMessage, 'user');
        messages.push({ role: "user", content: userMessage });
        userInput.value = ''; // Clear input field

        // Prepare API payload
        const payload = {
            model: modelId,
            messages: messages, // 문맥이 유지된 메시지 배열 전달
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

            // Append GPT's response to the UI and messages array
            appendMessage(botMessage, 'bot');
            messages.push({ role: "assistant", content: botMessage });

            // WebSocket을 통해 서버로 데이터 전송
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
