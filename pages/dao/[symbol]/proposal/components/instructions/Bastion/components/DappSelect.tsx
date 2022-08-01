import Select from '@components/inputs/Select'

export function DappSelect({
  onChange,
  dApps,
  value,
  error,
  label,
  noMaxWidth,
}: {
  onChange
  dApps: DappData[]
  value: DappData | undefined
  error?
  label?
  noMaxWidth?: boolean
}) {
  function getLabel(dApp: DappData | undefined) {
    if (dApp) {
      return (
        <div className="break-all text-fgd-1">
          <div className="mb-2">{dApp.label}</div>
          <div className="space-y-0.5 text-xs text-fgd-3">
            <div>{dApp.url}</div>
          </div>
        </div>
      )
    } else {
      return null
    }
  }
  return (
    <Select
      label={label}
      onChange={onChange}
      componentLabel={getLabel(value)}
      placeholder="Please select..."
      value={value}
      error={error}
      noMaxWidth={noMaxWidth}
    >
      {dApps.map((dApp) => {
        return (
          <Select.Option className="border-red" key={dApp.key} value={dApp}>
            {getLabel(dApp)}
          </Select.Option>
        )
      })}
    </Select>
  )
}

export interface DappData {
  key: string
  label: string
  url: string
}
