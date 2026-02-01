import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, inventory, type = "chat" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context about inventory
    const inventoryContext = inventory?.length > 0 
      ? `Current inventory:\n${inventory.map((item: any) => 
          `- ${item.name}: ${item.quantity} ${item.unit || 'pcs'}${item.expiry_date ? ` (expires: ${item.expiry_date})` : ''}`
        ).join('\n')}`
      : "The inventory is currently empty.";

    // Check for low stock and expired items
    const today = new Date().toISOString().split('T')[0];
    const lowStockItems = inventory?.filter((item: any) => 
      item.quantity <= (item.low_stock_threshold || 2)
    ) || [];
    const expiredItems = inventory?.filter((item: any) => 
      item.expiry_date && item.expiry_date < today
    ) || [];
    const expiringItems = inventory?.filter((item: any) => {
      if (!item.expiry_date) return false;
      const expDate = new Date(item.expiry_date);
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      return expDate <= threeDaysFromNow && expDate >= new Date(today);
    }) || [];

    const alertsContext = `
${lowStockItems.length > 0 ? `Low stock items (need restocking): ${lowStockItems.map((i: any) => i.name).join(', ')}` : ''}
${expiredItems.length > 0 ? `EXPIRED items (should be removed): ${expiredItems.map((i: any) => i.name).join(', ')}` : ''}
${expiringItems.length > 0 ? `Items expiring soon (within 3 days): ${expiringItems.map((i: any) => `${i.name} (${i.expiry_date})`).join(', ')}` : ''}
    `.trim();

    let systemPrompt = "";
    
    if (type === "chat") {
      systemPrompt = `You are Grocero, a smart and friendly AI grocery assistant. You help users manage their kitchen inventory, suggest recipes, and provide cooking tips.

${inventoryContext}

${alertsContext}

Your capabilities:
1. Answer questions about inventory (what's available, what's low, what's expired)
2. Suggest recipes based on available ingredients
3. Provide cooking tips and meal ideas
4. Recommend what to buy when items are low
5. Help minimize food waste by suggesting recipes for items expiring soon

Be concise, helpful, and practical. If asked about prices or where to buy, mention Blinkit, Zepto, and Instamart as options.
Format responses with markdown for better readability. Use bullet points and headers when listing multiple items.`;
    } else if (type === "recipe") {
      systemPrompt = `You are a creative chef assistant. Based on the available ingredients, suggest a delicious recipe.

${inventoryContext}

Provide:
1. Recipe name
2. Required ingredients (highlight which are available and which need to be purchased)
3. Step-by-step cooking instructions
4. Estimated cooking time
5. Serving size

Prioritize recipes that use items expiring soon to minimize waste.
${expiringItems.length > 0 ? `Try to use these items that are expiring soon: ${expiringItems.map((i: any) => i.name).join(', ')}` : ''}

Format the recipe in a clear, easy-to-follow markdown format.`;
    }

    console.log(`Processing ${type} request with ${messages?.length || 0} messages`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...(messages || []),
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add more credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Grocero chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
