document.addEventListener('DOMContentLoaded', () => {
    const apiUrl = "https://api.openai.com/v1/chat/completions";
    const modelId = "ft:gpt-4o-2024-08-06:chamkkae:chamkkae-v3a:AmwkrRHc";

    const chatbox = document.getElementById('chatbox');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const apiKeyInput = document.getElementById('apiKey');
    const interviewTitleInput = document.getElementById('interviewTitle');
    const personaDataInput = document.getElementById('personaData'); // 전역변수로
    const micButton = document.getElementById('micButton'); // 음성 입력 버튼 추가

    const audioElement = new Audio(); // 오디오 재생을 위한 HTMLAudioElement

    // function extractCurlyBracesContent(text) {
    //     const match = text.match(/\{.*?\}/);
    //     return match ? match[0] : null;  // 괄호 포함된 부분 반환, 없으면 null
    // }
    // const exampleText = "퍼소나 json 답변의 변수명을 여기로 넣으씨오";
    // const extracted = extractCurlyBracesContent(exampleText);
    
    // console.log(extracted); // "{내용:내용}"

    let messages = [ //content에 인터뷰 주제, 퍼소나 json 삽입
        {
            role: "system",
            content: `인터뷰 주제: ${interviewTitleInput.value}, 역할: ${personaDataInput.value}. 사용자가 제출한 자료에 맞는 가상의 사람을 연기해야합니다. 속어, 은어 사용을 하는 것을 적극 권하며, 설정된 출신 지역, 성격, 성향, MBTI에 맞춰 연기를 하면 됩니다. 출력은 한글자의 단답도 되고, 한문장도 되고, 뭐라고요?라고 4글자로 되물어도 됩니다. 길이가 길지만 않다면 오케이입니다. 반드시 모든 대화는 대화체 형태로 출력하며, 표, 단락, 문단, 기호나 이모지는 사용하지 않습니다. 모든 대화에서 인터뷰 대상자는 실수하고 질문을 던질 수도 있습니다.`
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
                console.log(`이전에 입력된 시스템 프롬프트는? [${messages[0].content}]`)
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

        const interviewTitle = interviewTitleInput.value.trim();
        const personaData = personaDataInput.value.trim();

        messages = [ //content에 인터뷰 주제, 퍼소나 json 삽입
            {
                role: "system",
                content: `인터뷰 주제: ${interviewTitle}, 역할: ${personaData}. 사용자가 제출한 자료에 맞는 가상의 사람을 연기해야합니다. 속어, 은어 사용을 하는 것을 적극 권하며, 설정된 출신 지역, 성격, 성향, MBTI에 맞춰 연기를 하면 됩니다. 출력은 한글자의 단답도 되고, 한문장도 되고, 뭐라고요?라고 4글자로 되물어도 됩니다. 길이가 길지만 않다면 오케이입니다. 반드시 모든 대화는 대화체 형태로 출력하며, 표, 단락, 문단, 기호나 이모지는 사용하지 않습니다. 모든 대화에서 인터뷰 대상자는 실수하고 질문을 던질 수도 있습니다.`
            }
        ];

        appendMessage(userMessage, 'user');
        messages.push({ role: "user", content: `${userMessage}` });
        userInput.value = '';

        const payload = {
            model: modelId,
            messages: messages,
            max_tokens: 4000, // 음성 tts 인식 한계가 4000이라 하길래 그대로 넣음
            temperature: 0.7,
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
