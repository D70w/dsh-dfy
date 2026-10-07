/** Signed wind force; attachment stability belongs to skin weights, not direction clipping. */
export function breezePose(body: number, chest: number, head: number) {
  return {
    armLeft: chest * 1.3,
    armRight: head * 1.1,
    waist: body * .95,
    // Absolute follow instead of subtracting nearly identical parent/child values.
    chest: chest * 1.4,
    head: head * .25 - chest * .35,
  }
}
