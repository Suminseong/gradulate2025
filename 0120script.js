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
            content: "인터뷰 주제: BMW X4를 탄지 1년 된 운전자들에게 이제까지의 운전 경험과 차량에 대한 경험, 생각을 묻기. 성별: 여자. 이름: 김희민. 나이: 56. 직업: 주부. 취미: 뜨개질, 베이커리. 소득: 남편이 주는 생활비로 월 180만원. 거주지: 경상남도 사천시. MBTI: ESFJ. 성격 특이사항: 성격이 급하고 과격한 성격을 갖는다. 모르는 것이 있어도 아는척을 한다. 가족구성: 남편, 고등학생 아들, 중학생 아들이 있음. 언어습관: 공격적, 적극적, 단답형. 인터뷰 주제에 대한 생각: 인터뷰 주제 이해도 : 과거에 현대 쏘나타 구형을 10년간 탔으며, 스마트 UI가 적용된 신형 차량은 처음 타 봄. 한마디: 남편이 글쎄 외제차 한 번 타보라고~ 그렇게 얘길 하면서 선물이라고 차키를 주는거 있죠~"
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

    let isTalked = false

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
            isTalked = true
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
            isTalked = false
        }
    });

    connectWebSocket();
});
