export type Unionized<Record, TaggedRecord> = {
  _Tags: keyof TaggedRecord;
  _Record: Record;
  _Union: TaggedRecord[keyof TaggedRecord]
  is: Predicates<TaggedRecord>
  as: Casts<Record, TaggedRecord>
  match: Match<Record, TaggedRecord>
  update: Update<Record, TaggedRecord>
} & Creators<Record, TaggedRecord>

export type Creators<Record, TaggedRecord> = {
  [T in keyof Record]: (value: Record[T]) => TaggedRecord[keyof TaggedRecord]
}

export type Predicates<TaggedRecord> = {
  [T in keyof TaggedRecord]: (variant: TaggedRecord[keyof TaggedRecord]) => variant is TaggedRecord[T]
}

export type Casts<Record, TaggedRecord> = {
  [T in keyof Record]: (variant: TaggedRecord[keyof TaggedRecord]) => Record[T]
}

export type Cases<Record, A> = {
  [T in keyof Record]: (value: Record[T]) => A
}

export type MatchCases<Record, TaggedRecord, A> =
  | Cases<Record, A>
  | (Partial<Cases<Record, A>> &
    {default: (variant: TaggedRecord[keyof TaggedRecord]) => A})
    
export type Match<Record, TaggedRecord> = {
  <A>(
    cases: MatchCases<Record, TaggedRecord, A>
  ): (variant: TaggedRecord[keyof TaggedRecord]) => A
  <A>(
    variant: TaggedRecord[keyof TaggedRecord],
    cases: MatchCases<Record, TaggedRecord, A>
  ): A
}

export type UpdateCases<Record, TaggedRecord> = Partial<{
  [T in keyof Record]: (value: Record[T]) => Partial<Record[T]>
}>

export type Update<Record, TaggedRecord> = {
  (
    cases: UpdateCases<Record, TaggedRecord>
  ): (variant: TaggedRecord[keyof TaggedRecord]) => TaggedRecord[keyof TaggedRecord]
  (
    variant: TaggedRecord[keyof TaggedRecord],
    cases: UpdateCases<Record, TaggedRecord>
  ): TaggedRecord[keyof TaggedRecord]
}
    
export type MultiValueVariants<Record extends DictRecord, TagProp extends string> = {
  [T in keyof Record]: { [_ in TagProp]: T } & Record[T]
}

export type SingleValueVariants<Record, TagProp extends string, ValProp extends string> = {
  [T in keyof Record]: { [_ in TagProp]: T } & { [_ in ValProp]: Record[T] }
}

// forbid usage of default property. reserved for pattern matching
export type DictRecord = { [tag: string]: { [field: string]: any }} & {default?: never}

/**
 * Create a tagged union from a record mapping tags to value types, along with associated
 * variant constructors, type predicates and `match` function.
 *
 * @param record A record mapping tags to value types. The actual values of the record don't
 * matter; they're just used in the types of the resulting tagged union. See `ofType`.
 * @param config An optional config object. By default tag='tag' and payload is merged into object itself 
 * @param config.tagProp An optional custom name for the tag property of the union.
 * @param config.valProp An optional custom name for the value property of the union. If not specified,
 * the value must be a dictionary type.
 */
export function unionize<Record, ValProp extends string, TagProp extends string = 'tag'>(
  record: Record,
  config: { valProp: ValProp, tagProp? : TagProp }
): Unionized<Record, SingleValueVariants<Record, TagProp, ValProp>>
export function unionize<Record extends DictRecord, TagProp extends string = 'tag'>(
  record: Record,
  config?: {tagProp: TagProp},
): Unionized<Record, MultiValueVariants<Record, TagProp>>
export function unionize<Record>(record: Record, config?: { valProp?: string, tagProp? : string } ) {
  const tagProp = config && config.tagProp || 'tag';
  const valProp = config && config.valProp;

  const creators = {} as Creators<Record, any>
  for (const tag in record) {
    creators[tag] = (value: any) =>
      valProp
        ? { [tagProp]: tag, [valProp]: value }
        : { ...value, [tagProp]: tag }
  }

  const is = {} as Predicates<any>
  for (const tag in record) {
    is[tag] = ((variant: any) => variant[tagProp] === tag) as any
  }

  const payload = (variant: any)=> valProp? variant[valProp]: variant
  
  const evalMatch = (cases: any, variant: any): any => {
    const k = variant[tagProp]
    return k in cases
    ? cases[k](payload(variant))
    // here we can have '"undefined is not a function". Is it worth checking?
    // it is <impossible> to get in ts but totally fine in js land
    : cases.default(variant)
  }
  
  const match = pseudoCurry(evalMatch);
  
  const as = {} as Casts<Record, any>
  for (const expectedTag in record) {
    as[expectedTag] = match(
      {
        [expectedTag]: (x: any) => x,
        default: (val: any) => {
          throw new Error(`Attempted to cast ${val[tagProp]} as ${expectedTag}`)
        }
      }
    )
  }

  const evalUpd = (cases: any, variant: any): any => {
    const k = variant[tagProp];
    return k in cases
    ? creators[k](immutableUpd(payload(variant), cases[k](payload(variant))))
    : variant;
  }
  
  return Object.assign({
    is,
    as,
    match,
    update: pseudoCurry(evalUpd)
  }, creators)
}

function pseudoCurry(evalFunc : (cases: any, variant: any) => any ): any {
  return function(casesOrVal: any, casesOrNone: any)
  {
    if (arguments.length == 1) {
      return (variant: any) => evalFunc(casesOrVal /*cases*/, variant)
    }
    
    return evalFunc(casesOrNone /*cases*/, casesOrVal /*variant*/)
  }
}

// todo fix me
const objType = Object.prototype.toString.call({})
const isObject = (maybeObj: any) => Object.prototype.toString.call(maybeObj) === objType
const immutableUpd = (old: any, updated: any) => isObject(old) ? Object.assign({}, old, updated) : updated;

/**
 * Creates a pseudo-witness of a given type. That is, it pretends to return a value of
 * type `T` for any `T`, but it's really just returning `undefined`. This white lie
 * allows convenient expression of the value types in the record you pass to `unionize`.
 */
export const ofType = <T>() => undefined as any as T

export default unionize
