export async function GET() {
    return Response.json({
      SAFE_ADDRESS: process.env.SAFE_ADDRESS || "❌ no leída",
      RPC_URL_POLYGON: process.env.RPC_URL_POLYGON ? "✅ cargada" : "❌ vacía",
    });
  }
  