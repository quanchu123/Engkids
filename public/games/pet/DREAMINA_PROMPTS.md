# Dreamina prompts for pet game assets

Use these prompts to create a new pet species and care items for the pet game.
Keep every PNG on a transparent background, centered, no text, no watermark.

## New pet species file names

Drop exported PNGs into:

`public/games/pet/stages/`

Recommended names for the new Dreamina set:

- `dreamina-2026-06-08-8213-egg.png`
- `dreamina-2026-06-08-8213-1.png`
- `dreamina-2026-06-08-8213-2.png`
- `dreamina-2026-06-08-8213-3.png`

## Dreamina image prompt: pet evolution chain

```text
Create a cute magical companion pet for a children's English learning game.
Style: premium 2D/3D cartoon game asset, soft rounded body, big friendly eyes,
bright cheerful colors, clean thick outline, polished mobile game quality,
centered full-body character, transparent background, no shadow, no text,
no watermark, consistent character design across all growth stages.

Make 4 separate PNG assets:
1. egg stage: a magical egg with the same color theme and small glowing marks.
2. baby stage: tiny cute pet, simple silhouette, playful expression.
3. teen stage: larger pet with clearer fantasy features and more details.
4. final stage: impressive friendly mythical pet, heroic but not scary,
sparkling aura, suitable for children aged 5-10.

Export each stage as an isolated transparent PNG:
dreamina-2026-06-08-8213-egg.png,
dreamina-2026-06-08-8213-1.png,
dreamina-2026-06-08-8213-2.png,
dreamina-2026-06-08-8213-3.png.
```

## Dreamina image prompt: care items

Drop exported PNGs into:

`public/games/pet/`

Recommended names:

- `dreamina-food.png`
- `dreamina-snack.png`
- `dreamina-milk.png`
- `dreamina-toy.png`
- `dreamina-brush.png`
- `dreamina-soap.png`
- `dreamina-bed.png`
- `dreamina-medicine.png`

```text
Create a matching care item icon set for a cute children's pet care game.
Style: same as the magical pet, premium 2D/3D cartoon, soft rounded shapes,
bright cheerful colors, thick clean outline, transparent background, no text,
no watermark, centered game UI icon.

Create separate PNG icons:
1. dreamina-food.png: a colorful bowl of healthy pet food.
2. dreamina-snack.png: a cute star-shaped treat.
3. dreamina-milk.png: a small fantasy milk bottle.
4. dreamina-toy.png: a bouncy ball or plush toy for playing.
5. dreamina-brush.png: a soft grooming brush.
6. dreamina-soap.png: bubbly bath soap.
7. dreamina-bed.png: cozy rounded pet bed.
8. dreamina-medicine.png: friendly first-aid bottle, not scary.
```

## Dreamina / video prompt: evolution animation

Use this if Dreamina can generate video, or pass it to Veo/Sora later. Save the
final clip as:

`public/games/pet/evolve/dreamina-2026-06-08-8213.mp4`

```text
Animate a joyful pet evolution reward for a children's English learning game.
The supplied pet starts as a glowing silhouette, sparkles swirl around it, a
soft magical beam rises, then it reveals the final friendly mythical pet form.
Camera gently pushes in, colorful particles, warm happy mood, premium cartoon
mobile game style, no text, no watermark, no scary effects, 16:9, 6-8 seconds.
```

## Code hook needed after images exist

After the 4 stage PNGs exist, add a new entry to `PET_SPECIES` in
`src/lib/pet-species.ts` using id `dreamina-2026-06-08-8213` and the stage
paths listed above.
