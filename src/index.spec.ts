import { ofType, unionize } from '.'

describe('merged', () => {

    const Foo = unionize({
      x: ofType<{ n: number }>(),
      y: ofType<{ s: string }>(),
    }, {tagProp: 'tag'})

    let foo: typeof Foo._Union

    beforeEach(() => {
      foo = Foo.x({ n: 3 })
    })

    it('creation', () => {
      expect(foo).toEqual({
        tag: 'x',
        n: 3,
      })
    })

    it('predicates', () => {
      expect(Foo.is.x(foo)).toBe(true)
      expect(Foo.is.y(foo)).toBe(false)
    })

    it('casts', () => {
      expect(Foo.as.x(foo).n).toBe(3)
      expect(() => Foo.as.y(foo)).toThrow('Attempted to cast x as y')
    })

    it('matching', () => {
      expect(Foo.match({
        x: ({ n }) => n + 9,
        y: ({ s }) => s.length,
      })(foo)).toBe(12)
      expect(Foo.match({
        y: ({ s }) => s.length,
        default: () => 42
      })(foo)).toBe(42)
    })

    it('inline matching', () => {
      expect(Foo.match(foo, {
        x: ({ n }) => n + 9,
        y: ({ s }) => s.length,
      })).toBe(12)
      expect(Foo.match(foo, {
        y: ({ s }) => s.length,
        default: () => 42
      })).toBe(42)
    })

    it('default accepts initial object', () => {
      expect(Foo.match(foo, { default: f => f })).toBe(foo)
      expect(Foo.match({ default: f => f })(foo)).toBe(foo)
    })

    describe('name conflicts', () => {
      it('avoidable', () => {
        const T = unionize({
          foo: ofType<{ x: number }>(),
        }, { tagProp:'conflict' })
        const input = { x: 42, conflict: 'oops' }
        expect(T.foo(input).conflict).toBe('foo')
      })
    })
  })

describe('separate', () => {

  const Foo = unionize({
    x: ofType<number>(),
    y: ofType<string>(),
  }, { tagProp:'flim', valProp:'flam' })

  let foo: typeof Foo._Union

  beforeEach(() => {
    foo = Foo.x(3)
  })

  it('creation', () => {
    expect(foo.flim).toBe('x')
    expect(foo.flam).toBe(3)
  })

  it('predicates', () => {
    expect(Foo.is.x(foo)).toBe(true)
    expect(Foo.is.y(foo)).toBe(false)
  })

  it('casts', () => {
    expect(Foo.as.x(foo)).toBe(3)
    expect(() => Foo.as.y(foo)).toThrow('Attempted to cast x as y')
  })

  it('matching', () => {
    expect(Foo.match({
      x: n => n + 9,
      y: s => s.length,
    })(foo)).toBe(12)
    expect(Foo.match({
      y: s => s.length,
      default: () => 42,
    })(foo)).toBe(42)
  })

  it('inline matching', () => {
    expect(Foo.match(foo, {
      x: n => n + 9,
      y: s => s.length,
    })).toBe(12)
    expect(Foo.match(foo, {
      y: s => s.length,
      default: () => 42,
    })).toBe(42)
  })

  it('default accepts initial object', () => {
    expect(Foo.match(foo, { default: f => f })).toBe(foo)
    expect(Foo.match({ default: f => f })(foo)).toBe(foo)
  })

  it('enumerable tags', () => {
    const Bar = unionize({
      x: ofType<number>(),
      y: ofType<string>(),
      z: ofType<boolean>(),
    }, {tagProp:'blum', valProp:'blam'})

    const bar = Foo.match(Bar)(foo)
    expect(bar.blum).toBe('x')
    expect(bar.blam).toBe(3)
  })
})