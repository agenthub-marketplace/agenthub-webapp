# AgentHub Day 2 tester message

Use this message for the first 3 to 5 internal testers.

---

Hello,

We are testing the AgentHub closed beta on production:

https://agenthub-webapp.vercel.app

The goal is to test the complete flow:

```text
marketplace -> rent an agent -> Stripe sandbox -> workspace -> launch an AI action -> leave a review
```

Important:

- This is Stripe test mode.
- No real payment will be made.
- Use this card: `4242 4242 4242 4242`.
- Use any future expiry date and any CVC.
- Do not enter sensitive real data, confidential company data, medical/legal/financial secrets, or personal HR evaluation data.

Please test one assigned agent:

- Meeting Notes Checklist
- Text Rewrite Assistant
- LinkedIn Content Studio
- Sales Email Builder
- Business SWOT Analyst

Checklist:

1. Sign up or log in.
2. Open marketplace/search.
3. Open your assigned agent.
4. Click `Louer cet agent`.
5. Complete Stripe sandbox checkout.
6. Confirm you land in the workspace.
7. Launch 1 or 2 actions with short non-sensitive text.
8. Reload the workspace and check that the result history remains visible.
9. Leave one review.
10. Send feedback with:
    - what you tried;
    - what worked;
    - what was confusing;
    - screenshot if something broke;
    - browser/device;
    - account email.

We are not testing real revenue yet. We are validating whether the product flow and the first AI agents feel useful.
