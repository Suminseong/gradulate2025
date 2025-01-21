document.addEventListener('DOMContentLoaded', () => {
    const apiUrl = "https://api.openai.com/v1/chat/completions";
    const modelId = "ft:gpt-4o-2024-08-06:chamkkae:chamkkae-v3a:AmwkrRHc";

    const chatbox = document.getElementById('chatbox');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const apiKeyInput = document.getElementById('apiKey');
    const micButton = document.getElementById('micButton'); // 음성 입력 버튼 추가

    const audioElement = new Audio(); // 오디오 재생을 위한 HTMLAudioElement

    const messages = [
        {
            role: "system",
            content: "사용자가 제출한 내용을 읽고 퍼소나를 생성합니다. 성별: 남자 또는 여자. 이름: 한국식으로 3글자 이름만 허용. 나이: 사용자가 원하는 연령대에 맞춰 생성. 직업: 사용자가 제시한 인터뷰 또는 상황조건에 맞게 생성합니다. 또는, 사용자가 원하는 직업으로 넣어도 됩니다. 취미: 가상의 인물이 가진 취미입니다. 인터뷰 주제와 꼭 관련될 필요는 없으며, MBTI나 거주지, 소득과 관련성만 있으면 됩니다. 예를 들어, 소득이 낮은데 자동차 수집, 악기 취미가 있으면 안됨. 소득: 알바/정규직/계약직, 현재 벌고 있는 연간 수입. 거주지(도/광역시~시/군/구): 대전광역시 유성구, 경상남도 사천시 등 대략적인 지명만 적으면 됩니다.  MBTI: 16가지 성격유형인 MBTI중 하나를 골라 집어넣은 뒤, 그에 대한 짧은 설명도 적으세요. 성격 특이사항: MBTI로 표현되지 않을 수 있는 내용들도 자유롭게 추가합니다. 가족구성: 1인가구, 연인동거, 결혼, 자녀유무, 부모동거, 조부모가정, 한부모가정, 아동보호소, 기러기가정 등등 다양한 상황들에서 선택. 언어습관: 공격적, 다혈질, 내성적, 적극적, 수비적, 말 더듬음, 소극적, 단답형, 장문형, 지역 사투리 등 주요 언어습관. 인터뷰 주제에 대한 생각: 인터뷰 주제에 대한 이해도, 흥미, 경험에 대한 이야기, 상황등을 100자 이내로 자유롭게 채웁니다. 한마디: 인터뷰 대상자가 자기소개를 하는 한 문장 대사를 출력. 언어습관을 활용."
        }
    ];

    let socket;

    function connectWebSocket() {
        socket = new WebSocket("ws://localhost:5501/ws");

        socket.onopen = () => {
            console.log("WebSocket connection established.");
        };

        socket.onmessage = async (event) => {
            try {
                const audioBlob = new Blob([event.data], { type: 'audio/wav' });
                const audioUrl = URL.createObjectURL(audioBlob);
                audioElement.src = audioUrl;
                audioElement.play();
                console.log("Audio is playing...");
            } catch (error) {
                console.error("Error processing WebSocket message:", error);
            }
        };

        socket.onclose = (event) => {
            console.warn("WebSocket connection closed:", event.code);
        };

        socket.onerror = (error) => {
            console.error("WebSocket error:", error);
        };
    }

    function appendMessage(message, sender) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${sender}`;
        messageElement.textContent = message;
        chatbox.appendChild(messageElement);
        chatbox.scrollTop = chatbox.scrollHeight;
    }

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

        appendMessage(userMessage, 'user');
        messages.push({ role: "user", content: userMessage });
        userInput.value = '';

        const payload = {
            model: modelId,
            messages: messages,
            max_tokens: 2700,
            temperature: 1,
            top_p: 0.8,
            frequency_penalty: 0.2,
            presence_penalty: 0.06
        };

        try {
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

            appendMessage(botMessage, 'bot');
            messages.push({ role: "assistant", content: botMessage });

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

    let isTalked = false;

function enableSpeechInput() {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = "ko-KR"; // 한국어 설정
    recognition.interimResults = false;

    recognition.onstart = () => {
        console.log("Voice recognition started...");
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log("Recognized speech:", transcript);
        userInput.value = transcript; // 음성 입력 내용을 채움
        isTalked = true;

        // 메시지 자동 전송
        sendMessage();
        isTalked = false; // 상태 초기화
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
    };

    recognition.onend = () => {
        console.log("Voice recognition ended.");
    };

    recognition.start();
}

sendButton.addEventListener('click', sendMessage);
micButton.addEventListener('click', enableSpeechInput); // 마이크 버튼 이벤트
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' || isTalked) {
        sendMessage();
        isTalked = false; // 상태 초기화
    }
});

    connectWebSocket();
});
