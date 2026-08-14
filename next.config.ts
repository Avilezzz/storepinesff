import type { NextConfig } from "next";

// Las imágenes de producto viven en el bucket público `productos` de Supabase,
// así que next/image necesita permiso explícito para optimizar ese host.
const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" },
    ],
  },
};

export default nextConfig;
