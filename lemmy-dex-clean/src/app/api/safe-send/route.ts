import { NextResponse } from "next/server";
import { ethers } from "ethers";
import Safe from "@safe-global/protocol-kit";
import SafeApiKit from "@safe-global/api-kit";
import EthersAdapter from "@safe-global/safe-ethers-lib";
import { MetaTransactionData, OperationType } from "@safe-global/types-kit";

const SAFE_ADDRESS = process.env.SAFE_ADDRESS!;
const RPC_URL = process.env.RPC_URL_POLYGON!;
const RELAYER_PK = process.env.RELAYER_PK!;
const SAFE_API_KEY = process.env.SAFE_API_KEY!;
const CHAIN_ID = 137; // Polygon

export async function POST(req: Request) {
  try {
    const { to, data, value } = await req.json();

    if (!to || !data) {
      return NextResponse.json(
        { ok: false, error: "Missing parameters" },
        { status: 400 }
      );
    }

    console.log("🚀 Safe Send TX:", { to, value, data: data.slice(0, 20) + "..." });

    // 1️⃣ Provider + Signer
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(RELAYER_PK, provider);
    const senderAddress = await signer.getAddress();

    // 2️⃣ Adapter (compatible con tu stack actual)
    const ethAdapter = new EthersAdapter({
      ethers,
      signerOrProvider: signer,
    });

    // 3️⃣ Inicializar el Safe SDK
    const safeSdk = await Safe.init({
      ethAdapter,
      safeAddress: SAFE_ADDRESS,
    });

    // 4️⃣ Armar la meta-transacción
    const tx: MetaTransactionData = {
      to,
      value: value ?? "0",
      data,
      operation: OperationType.Call,
    };

    const safeTransaction = await safeSdk.createTransaction({ transactions: [tx] });

    // 5️⃣ Obtener hash y firmar
    const safeTxHash = await safeSdk.getTransactionHash(safeTransaction);
    const senderSignature = await safeSdk.signHash(safeTxHash);

    // 6️⃣ API Kit con tu API Key
    const apiKit = new SafeApiKit({
      chainId: CHAIN_ID,
      apiKey: SAFE_API_KEY,
    });

    // 7️⃣ Proponer la transacción al Safe Service
    await apiKit.proposeTransaction({
      safeAddress: SAFE_ADDRESS,
      safeTransactionData: safeTransaction.data,
      safeTxHash,
      senderAddress,
      senderSignature: senderSignature.data,
    });

    const link = `https://app.safe.global/transactions/${safeTxHash}`;
    console.log("✅ TX propuesta correctamente:", link);

    return NextResponse.json({
      ok: true,
      safeTxHash,
      sender: senderAddress,
      link,
    });
  } catch (err: any) {
    console.error("❌ Error enviando TX al Safe:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
