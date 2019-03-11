export interface ParamObj {
  [key: string]: string | Array<string>
}

export default class Params {
  private params: Map<string, Array<string>> = new Map()

  public extend(paramObj: ParamObj) {
    for (const [key, value] of Object.entries(paramObj)) {
      if (Array.isArray(value)) {
        for (const innerValue of value) {
          this.addOne(key, innerValue)
        }
      } else {
        this.addOne(key, value)
      }
    }
  }

  public addOne(key: string, value: string) {
    if (!this.params.has(key)) {
      this.params.set(key, [])
    }
    this.params.get(key)!.push(value)
  }

  public addOneEscaped(escapedKey: string, escapedValue: string) {
    this.addOne(decodeURIComponent(escapedKey), decodeURIComponent(escapedValue))
  }

  public get(key: string): Array<string> {
    return this.params.get(key) || []
  }

  public remove(key: string): Array<string> | undefined {
    const ret = this.params.get(key)
    this.params.delete(key)
    return ret
  }

  public sorted(): string {
    const params =
      [...this.params.entries()].map(([key, values]) => values.map(value => ({ key, value })))
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
    return paramsFlattened.map(({ key, value }) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')
  }
}
