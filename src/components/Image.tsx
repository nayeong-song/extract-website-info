type ImageComponentProps = {
  content: Buffer
  contentType: string
}

export const ImageComponent = ({
  content,
  contentType,
}: ImageComponentProps) => {
  if (contentType == "application/svg+xml") {
    return <div dangerouslySetInnerHTML={{ __html: content }} />
  } else {
    const imageSrc = `data:${contentType};base64,${content}`
    return <img src={imageSrc} alt='Logo' />
  }
}
