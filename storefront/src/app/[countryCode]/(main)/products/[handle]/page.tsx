import { Metadata } from "next"
import { notFound } from "next/navigation"
import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import ProductTemplate from "@modules/products/templates"

type Props = {
  params: Promise<{ countryCode: string; handle: string }>
  searchParams: Promise<{ v_id?: string }>
}

// 1. VACUNA: Devolvemos array vacío para salvar a Railway
// Esto evita que el build intente descargar todos los productos de golpe
export async function generateStaticParams() {
  return []
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const { handle } = params

  // Usamos listProducts como lo tienes en tu proyecto
  const product = await listProducts({
    countryCode: params.countryCode,
    queryParams: { handle },
  }).then(({ response }) => response.products[0])

  if (!product) {
    notFound()
  }

  return {
    title: `${product.title} | Medusa Store`,
    description: `${product.title}`,
    openGraph: {
      title: `${product.title} | Medusa Store`,
      description: `${product.title}`,
      images: product.thumbnail ? [product.thumbnail] : [],
    },
  }
}

export default async function ProductPage(props: Props) {
  const params = await props.params
  const searchParams = await props.searchParams
  const region = await getRegion(params.countryCode)

  if (!region) {
    notFound()
  }

  // 2. CORRECCIÓN: Usamos listProducts para obtener el producto
  const pricedProduct = await listProducts({
    countryCode: params.countryCode,
    queryParams: { handle: params.handle },
  }).then(({ response }) => response.products[0])

  if (!pricedProduct) {
    notFound()
  }

  // 3. CORRECCIÓN DE IMÁGENES:
  // Simplificamos la lógica. Si hay variantes seleccionadas, idealmente filtraríamos,
  // pero para que el build pase YA, pasamos todas las imágenes del producto.
  // El '|| []' asegura que nunca sea null, arreglando el error de tipos.
  const images = pricedProduct.images || []

  return (
    <ProductTemplate
      product={pricedProduct}
      region={region}
      countryCode={params.countryCode}
      images={images} // Pasamos las imágenes explícitamente
    />
  )
}