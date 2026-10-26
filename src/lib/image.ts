// Reduz a foto enviada para caber no armazenamento do navegador (celulares geram fotos de vários MB).
export function fileToResizedDataUrl(
  file: File,
  maxSide = 480,
  quality = 0.82,
  format: 'image/jpeg' | 'image/png' = 'image/jpeg',
  square = false // recorta o centro em quadrado (logo do negócio vira ícone do app)
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Escolha um arquivo de imagem.'))
      return
    }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Não foi possível processar a imagem.'))
        return
      }
      if (square) {
        const side = Math.min(img.width, img.height)
        const out = Math.min(maxSide, side)
        canvas.width = canvas.height = out
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, out, out)
      } else {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      }
      resolve(canvas.toDataURL(format, quality))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não foi possível ler a imagem.'))
    }
    img.src = url
  })
}
