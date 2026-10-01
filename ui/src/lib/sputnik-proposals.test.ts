import { Amount } from "near-kit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DaoPlan, SessionWallet, SputnikPolicy } from "./sputnik-proposals";

const view = vi.fn();

vi.mock("near-kit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("near-kit")>();
  return {
    ...actual,
    Near: class MockNear {
      view = view;
    },
  };
});

const { buildAddProposalArgs, canAccountPropose, proposeAsSession } = await import(
  "./sputnik-proposals"
);

afterEach(() => {
  vi.clearAllMocks();
});

beforeEach(() => {
  view.mockReset();
});

const callPlan = {
  kind: "call",
  receiverId: "dev.everything.near",
  methodName: "__fastdata_kv",
  args: { "apps/chicago.sputnik-dao.near/citynode.app/bos.config.json": "{}" },
  gas: "300 Tgas",
  attachedDeposit: "0",
} satisfies Extract<DaoPlan, { kind: "call" }>;

describe("buildAddProposalArgs", () => {
  it("wraps a FunctionCall plan with base64 args and raw gas", () => {
    expect(buildAddProposalArgs(callPlan, "Set homepage for chicago.citynode.app")).toEqual({
      proposal: {
        description: "Set homepage for chicago.citynode.app",
        kind: {
          FunctionCall: {
            receiver_id: "dev.everything.near",
            actions: [
              {
                method_name: "__fastdata_kv",
                args: btoa(JSON.stringify(callPlan.args)),
                deposit: "0",
                gas: "300000000000000",
              },
            ],
          },
        },
      },
    });
  });

  it("wraps a Transfer plan", () => {
    expect(
      buildAddProposalArgs(
        { kind: "transfer", receiverId: "alice.near", amountYocto: "1000" },
        "fund treasury",
      ),
    ).toEqual({
      proposal: {
        description: "fund treasury",
        kind: {
          Transfer: { token_id: "", receiver_id: "alice.near", amount: "1000" },
        },
      },
    });
  });
});

describe("proposeAsSession", () => {
  it("attaches the DAO proposal bond as attachedDeposit on add_proposal", async () => {
    view.mockResolvedValue({ proposal_bond: "100000000000000000000000" });
    const send = vi.fn().mockResolvedValue({ transaction: { hash: "abc" } });
    const functionCall = vi.fn().mockReturnValue({ send });
    const transaction = vi.fn().mockReturnValue({ functionCall });
    const wallet = {
      ensureConnected: vi.fn().mockResolvedValue(true),
      getAccountId: vi.fn().mockReturnValue("member.near"),
      getNearClient: vi.fn().mockReturnValue({ transaction }),
    } satisfies SessionWallet;

    await proposeAsSession(wallet, "chicago.sputnik-dao.near", callPlan, "desc");

    expect(view).toHaveBeenCalledWith("chicago.sputnik-dao.near", "get_policy", {});
    expect(transaction).toHaveBeenCalledWith("member.near");
    expect(functionCall).toHaveBeenCalledWith(
      "chicago.sputnik-dao.near",
      "add_proposal",
      buildAddProposalArgs(callPlan, "desc"),
      {
        gas: "100 Tgas",
        attachedDeposit: Amount.yocto(100000000000000000000000n),
      },
    );
  });

  it("requires a connected session wallet before sending", async () => {
    const wallet = {
      ensureConnected: vi.fn().mockResolvedValue(false),
      getAccountId: vi.fn().mockReturnValue(null),
      getNearClient: vi.fn(),
    } satisfies SessionWallet;

    await expect(
      proposeAsSession(wallet, "chicago.sputnik-dao.near", callPlan, "desc"),
    ).rejects.toThrow("Connect your NEAR wallet first");
    expect(wallet.getNearClient).not.toHaveBeenCalled();
    expect(view).not.toHaveBeenCalled();
  });
});

describe("canAccountPropose", () => {
  const policy = {
    roles: [
      {
        name: "Requestor",
        kind: { Group: ["member.near"] },
        permissions: ["call:AddProposal"],
      },
    ],
  } satisfies SputnikPolicy;

  it("allows accounts in an AddProposal role", () => {
    expect(canAccountPropose(policy, "member.near")).toBe(true);
  });

  it("denies accounts outside the AddProposal roles", () => {
    expect(canAccountPropose(policy, "outsider.near")).toBe(false);
  });
});
