import { describe, expect, it } from "vitest";
import { validateLiveCodeRegistry } from "./registryValidation";

const Button = () => null;

describe("validateLiveCodeRegistry", () => {
  it("returns invalid-item issues for malformed runtime registry shapes", () => {
    const malformedRegistry = [
      null,
      [],
      { name: "BadCategory", category: 1, examples: [{ name: "Basic", code: "<BadCategory />" }] },
      { name: "BadExample", examples: [null] },
      { name: "BadProps", examples: [{ name: "Basic", code: "<BadProps />" }], props: {} },
      { name: "BadPropType", examples: [{ name: "Basic", code: "<BadPropType />" }], props: [{ name: "label", type: 1 }] },
    ] as never[];

    const issues = validateLiveCodeRegistry(malformedRegistry, {});

    expect(issues.map(({ code, itemIndex, path }) => ({ code, itemIndex, path }))).toEqual([
      { code: "invalid-item", itemIndex: 0, path: "registry[0]" },
      { code: "invalid-item", itemIndex: 1, path: "registry[1]" },
      { code: "invalid-item", itemIndex: 2, path: "registry[2]" },
      { code: "invalid-item", itemIndex: 3, path: "registry[3]" },
      { code: "invalid-item", itemIndex: 4, path: "registry[4]" },
      { code: "invalid-item", itemIndex: 5, path: "registry[5]" },
    ]);
  });

  it("accepts a selectable registry item backed by the runtime scope", () => {
    expect(validateLiveCodeRegistry([{
      name: "Button",
      category: "Actions",
      examples: [{ name: "Primary", code: '<Button label="Save" />' }],
      props: [{ name: "label", type: "string", required: true }],
    }], { Button })).toEqual([]);
  });

  it("rejects duplicate names and missing runtime scope members", () => {
    const issues = validateLiveCodeRegistry([
      { name: "Button", examples: [{ name: "One", code: "<Button />" }] },
      { name: "Button", examples: [{ name: "Two", code: "<Button />" }] },
      { name: "Missing", examples: [{ name: "Missing", code: "<Missing />" }] },
    ], { Button });

    expect(issues.map((item) => item.code)).toEqual(expect.arrayContaining([
      "duplicate-item-name",
      "missing-scope-member",
      "example-missing-scope",
    ]));
  });

  it("rejects unsafe, invalid, and scope-incomplete examples", () => {
    const issues = validateLiveCodeRegistry([{
      name: "Button",
      examples: [
        { name: "Unsafe", code: "<Button />; window.alert('no')" },
        { name: "Broken", code: "<Button" },
        { name: "Unknown", code: "<Unknown />" },
      ],
    }], { Button });

    expect(issues.map((item) => item.code)).toEqual(expect.arrayContaining([
      "unsafe-example",
      "example-missing-scope",
    ]));
  });

  it("rejects inconsistent category identities and invalid prop metadata", () => {
    const issues = validateLiveCodeRegistry([
      {
        name: "Button",
        category: "Actions",
        examples: [{ name: "One", code: "<Button />" }],
        props: [{ name: "label", required: true }, { name: "label", type: "string" }],
      },
      {
        name: "OtherButton",
        category: "actions",
        examples: [{ name: "Two", code: "<Button />" }],
      },
    ], { Button, OtherButton: Button });

    expect(issues.map((item) => item.code)).toEqual(expect.arrayContaining([
      "duplicate-prop",
      "inconsistent-category",
      "invalid-prop",
    ]));
  });

  it("allows unavailable and explicitly hidden metadata to remain descriptive", () => {
    expect(validateLiveCodeRegistry([
      { name: "Unavailable", disabledReason: "Not in scope", examples: [] },
      { name: "Internal", sandboxVisible: false, examples: [] },
    ], {})).toEqual([]);
  });
});
