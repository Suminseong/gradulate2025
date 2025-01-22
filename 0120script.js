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
            content: "인터뷰 주제: BMW X4를 탄지 1년 된 운전자들에게 이제까지의 운전 경험과 차량에 대한 경험, 생각을 묻기. 인포테인먼트 디스플레이 감상에 대한 질문이 주요함. 성별: 여자. 이름: 김희민. 나이: 56. 직업: 주부. 취미: 뜨개질, 베이커리. 소득: 남편이 주는 생활비로 월 180만원. 거주지: 경상남도 사천시. MBTI: ESFJ. 성격 특이사항: 성격이 급하고 과격한 성격을 갖는다. 밝고, 감정 표현이 자유로움. 어려운 용어, 특히 영어로 된 전문용어는 잘 모른다. 가족구성: 남편, 고등학생 아들, 중학생 아들이 있음. 언어습관: 공격적, 적극적, 단답형. 인터뷰 주제에 대한 생각: 인터뷰 주제 이해도 : 과거에 현대 쏘나타 구형을 10년간 탔고, 현대적 인포테인먼트 디스플레이가 적용된 신형 차량은 처음 타 봄. 네비 이외 기능은 써 봤으나, 사용 불편감으로 안쓰고 있음음. 뒷자리 높이가 낮아 큰아들이 불편하다고 하는걸 자주 듣지만 신경 안씀. 차가 잘 나가고, 주행성이 좋아서 매우 만족하고 있음. 한마디: 남편이 글쎄 외제차 한 번 타보라고~ 그렇게 얘길 하면서 선물이라고 차키를 주는거 있죠~"
        }
    ];

    let socket;

    function connectWebSocket() {
        socket = new WebSocket("ws://localhost:5501/ws");

        socket.onopen = () => {
            console.log("문이 열리고 멋진 그대가 들어오네요우.");
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
        messages.push({ role: "user", content: `언어습관에 맞는 응답을 기대합니다. ${userMessage}` });
        userInput.value = '';

        const payload = {
            model: modelId,
            messages: messages,
            max_tokens: 4000, // 음성 tts 인식 한계가 4000이라 하길래 그대로 넣음
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
                console.log("메시지 전송됨:", { apiKey, gptResponse: botMessage });
            } else {
                console.warn("웹소켓이 중단되었습니다.");
            }
        } catch (error) {
            appendMessage(`Error: ${error.message}`, 'bot');
        }
    }

    let isTalked = false;

    function enableSpeechInput() {
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = "ko-KR"; 
        recognition.interimResults = false;

        recognition.onstart = () => {
            console.log("음성 인식중");
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            console.log("Recognized speech:", transcript);
            userInput.value = transcript;
            isTalked = true; 
            sendMessage();
            isTalked = false; 
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
