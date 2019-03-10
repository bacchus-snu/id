export interface ParamObj {
  [key: string]: string | Array<string>
}

export default class Params {
  private escapedParams: Map<string, Array<string>> = new Map()

  public extend(paramObj: ParamObj) {
    for (const [key, value] of Object.entries(paramObj)) {
      const escapedKey = encodeURIComponent(key)
      if (Array.isArray(value)) {
        for (const innerValue of value) {
          this.addOneEscaped(escapedKey, encodeURIComponent(innerValue))
        }
      } else {
        this.addOneEscaped(escapedKey, encodeURIComponent(value))
      }
    }
  }

  public addOneEscaped(escapedKey: string, escapedValue: string) {
    if (!this.escapedParams.has(escapedKey)) {
      this.escapedParams.set(escapedKey, [])
    }
    this.escapedParams.get(escapedKey)!.push(escapedValue)
  }

  public get(key: string): Array<string> {
    return this.escapedParams.get(encodeURIComponent(key)) || []
  }

  public remove(key: string): Array<string> | undefined {
    const escapedKey = encodeURIComponent(key)
    const ret = this.escapedParams.get(escapedKey)
    this.escapedParams.delete(escapedKey)
    return ret
  }

  public sorted(): string {
    const params =
      [...this.escapedParams.entries()].map(([key, values]) => values.map(value => ({ key, value })))
    const paramsFlattened = ([] as Array<{ key: string, value: string }>).concat(...params)
    paramsFlattened.sort((a, b) => {
      // Sort by key
      const x = a.key.localeCompare(b.key)
      if (x !== 0) {
        return x
      }
      // Sort by value
      return a.value.localeCompare(b.value)
    })
    return paramsFlattened.map(({ key: k, value: v }) => `${k}=${v}`).join('&')
  }
}
