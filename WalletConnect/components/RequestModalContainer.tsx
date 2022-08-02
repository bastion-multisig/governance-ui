import { Container, Text } from '@nextui-org/react'
import { ReactNode } from 'react'

/**
 * Types
 */
interface IProps {
  title: string
  children: ReactNode | ReactNode[]
}

/**
 * Component
 */
export default function RequestModalContainer({ children, title }: IProps) {
  return (
    <>
      <Text h3>{title}</Text>

      <Container css={{ padding: 0 }}>{children}</Container>
    </>
  )
}
