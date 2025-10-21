/** @type {import('next').NextConfig} */
import dotenv from 'dotenv';
dotenv.config(); // 👈 esto carga tanto .env.local como .env

const nextConfig = {
  reactStrictMode: true,
  env: {
    UNISWAP_API_KEY: process.env.UNISWAP_API_KEY,
    SAFE_ADDRESS: process.env.SAFE_ADDRESS,
    PRIVATE_KEY: process.env.PRIVATE_KEY,
    RPC_URL_POLYGON: process.env.RPC_URL_POLYGON,
  },
};

export default nextConfig;
