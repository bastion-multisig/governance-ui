import { Col, Row, Text } from '@nextui-org/react'
import { useMemo } from 'react'
import { CodeBlock, codepen } from 'react-code-blocks'

/**
 * Types
 */
interface IProps {
  data: Record<string, unknown>
}

/**
 * Component
 */
export default function RequestDataCard({ data }: IProps) {
  const text = useMemo(() => JSON.stringify(data, null, 2), [])
  return (
    <Row>
      <Col>
        <Text h5>Data</Text>
        <CodeBlock
          showLineNumbers={false}
          text={text}
          style={{ fontSize: 12 }}
          theme={codepen}
          language="json"
        />
      </Col>
    </Row>
  )
}
