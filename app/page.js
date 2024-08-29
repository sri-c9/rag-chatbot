"use client";
import { Box, Button, Stack, TextField } from "@mui/material";
import { useState } from "react";

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi, I'm the RateMyProfessor support assistant. How can I help you today?",
    },
  ]);

  const [message, setMessage] = useState("");

  const sendMessage = async () => {
    setMessages((messages) => [
      ...messages,
      { role: "user", content: message },
      { role: "assistant", content: "" },
    ]);

    setMessage("");

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([...messages, { role: "user", content: message }]),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let result = "";
    let done = false;

    while (!done) {
      const { value, done: isDone } = await reader.read();
      done = isDone;

      if (value) {
        const text = decoder.decode(value, { stream: true });

        setMessages((messages) => {
          let lastMessage = messages[messages.length - 1];
          let otherMessages = messages.slice(0, messages.length - 1);
          return [
            ...otherMessages,
            { ...lastMessage, content: lastMessage.content + text },
          ];
        });

        result += text;
      }
    }
    return result;
  };

  return (
    <Box
      width="100vw"
      height="100vh"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      bgcolor="background.default" // Set a background color for the whole page
    >
      <Stack
        flexDirection="column"
        width="500px"
        height="700px"
        border="1px solid black"
        padding={2}
        spacing={3}
        bgcolor="white" // Set a white background for the chat container
        display="flex"
      >
        {/* Messages Display Area */}
        <Box
          flex="1" // This makes the Box grow to take available space
          overflow="auto" // Allows scrolling if content overflows
        >
          {messages.map((message, index) => (
            <Box
              mt={2}
              key={index}
              display="flex"
              justifyContent={
                message.role === "assistant" ? "flex-start" : "flex-end"
              }
            >
              <Box
                bgcolor={
                  message.role === "assistant"
                    ? "primary.main"
                    : "secondary.main"
                } // Use light colors for better visibility
                color="black" // Ensure text color contrasts with background
                borderRadius={16}
                padding={2}
              >
                {message.content}
              </Box>
            </Box>
          ))}
        </Box>

        {/* Input and Send Button */}
        <Stack
          direction="row"
          spacing={2}
          mt={2}
          // alignSelf="flex-end"
        >
          <TextField
            label="Message"
            fullWidth
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button
            variant="contained"
            onClick={sendMessage}
          >
            Send
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
