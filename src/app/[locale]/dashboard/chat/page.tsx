'use client';

import { useState, useCallback } from 'react';
import QuickPromptsList from '@/components/chat/QuickPromptsList';
import ChatBox from '@/components/chat/ChatBox';
import { ChatMessage } from '@/types';

const quickPrompts = [
  'Show me yesterday\'s sales summary',
  'Which products are at risk of stockout?',
  'Which products have the lowest rating?',
  'Create an action plan for this week',
  'What are my top performing categories?',
  'How did my competitors perform last week?',
];

// Simulated AI responses
const getAIResponse = (prompt: string): string => {
  const responses: Record<string, string> = {
    'show me yesterday\'s sales summary': `Here's your sales summary for yesterday:

**Total Revenue:** 245,780 RUB
**Orders:** 82
**Average Order Value:** 2,997 RUB

Top performing products:
1. Wireless Earbuds Pro - 28 orders
2. Smart Watch Series 5 - 19 orders
3. Portable Charger 20K - 15 orders

Revenue is up 12.5% compared to the same day last week.`,
    'which products are at risk of stockout?': `Based on current inventory levels and sales velocity, these products are at risk:

**Critical (< 2 days of stock):**
- Wireless Earbuds Pro: 12 units left (1.5 days at current rate)

**Warning (< 5 days of stock):**
- USB-C Hub 7-in-1: 28 units left (4 days at current rate)
- Portable Charger 20K: 45 units left (4.5 days at current rate)

I recommend placing restock orders immediately for the critical items.`,
    'which products have the lowest rating?': `Here are your products with the lowest ratings:

1. **Bluetooth Speaker Mini** - 4.5 stars
   Recent complaints: Battery life, volume controls

2. **USB-C Hub 7-in-1** - 4.4 stars
   Recent complaints: Compatibility issues with some laptops

3. **Smart Watch Series 5** - 4.6 stars
   Recent complaints: App connectivity

All products are above 4.0, which is good! Consider addressing the specific complaints to improve ratings further.`,
  };

  const lowerPrompt = prompt.toLowerCase();
  for (const [key, response] of Object.entries(responses)) {
    if (lowerPrompt.includes(key) || key.includes(lowerPrompt.slice(0, 20))) {
      return response;
    }
  }

  return `I understand you're asking about "${prompt}".

This is a demo response. In the full version, I would analyze your marketplace data and provide specific insights and recommendations.

Is there something specific about your sales, inventory, or competitors you'd like to know?`;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = useCallback(async (content: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));

    const aiResponse: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: getAIResponse(content),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, aiResponse]);
    setIsLoading(false);
  }, []);

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* Quick Prompts */}
        <div className="bg-surface rounded-xl border border-border p-5">
          <h3 className="text-base font-semibold text-foreground mb-4">Ask your data</h3>
          <QuickPromptsList prompts={quickPrompts} onSelect={handleSendMessage} />
        </div>

        {/* Chat Box */}
        <div className="lg:col-span-2 h-full">
          <ChatBox messages={messages} onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
