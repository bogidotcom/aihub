export const media = (src) => {
  if (!src) return ''
  if (/^https?:\/\//i.test(src) || src.startsWith('data:')) return src
  return `${import.meta.env.BASE_URL}${String(src).replace(/^\//, '')}`
}
