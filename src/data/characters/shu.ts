import type {Character} from '../../types/character'

/**
 * Shu characters. One file per kingdom — see ./index.ts for how they are
 * combined and for the conventions every entry follows.
 */
export const shu: Character[] = [
  {
    id: 'liu-bei',
    name: 'Liu Bei',
    title: 'The Red King',
    kingdom: 'shu',
    health: 4,
    abilities: [
      {
        name: '[Ability]',
        description:
          'During your action phase, you can give any number of hand cards to any other players. If you give 2 or more hand cards, you recover 1 health',
        tags: ['heal'],
      },
      {
        name: '[King Ability]',
        description:
          'Another character from the Shu kingdom may play an [Attack] on your behalf',
        tags: ['king'],
      },
    ],
    variants: [
      {id: 'liu-bei-2', label: 'Alternate Art'},
    ]
  },
  {
    id: 'guan-yu',
    name: 'Guan Yu',
    title: 'Red Cards are Attack',
    kingdom: 'shu',
    health: 4,
    abilities: [
      {
        name: '[Ability]',
        description:
          'You can use any red-suited card as an [Attack]',
      }
    ]
  },
  {
    id: 'zhang-fei',
    name: 'Zhang Fei',
    title: 'Built-in Crossbow Guy',
    kingdom: 'shu',
    health: 4,
    abilities: [
      {
        name: '[Ability]',
        description:
          'During your action phase, you can use an unlimited number of [Attack]',
      }
    ]
  },
  {
    id: 'zhuge-liang',
    name: 'Zhuge Liang',
    title: 'Old Steve',
    kingdom: 'shu',
    health: 3,
    abilities: [
      {
        name: '[Ability]',
        description:
          'At the beginning of your turn (before any phases), you can look at X number of cards at the top of the deck (X being the number of players alive, capped at 5) and re-arrange them in any order, and/or place any number of them to the bottom of the deck',
      },
      {
        name: '[Enforced Ability]',
        description:
          'When you have no hand cards, you can not be the target of [Attack] or [Duel]',
        tags: ['enforced'],
      }
    ]
  },
  {
    id: 'zhao-yun',
    name: 'Zhao Yun',
    title: 'Attack ⇄ Dodge',
    kingdom: 'shu',
    health: 4,
    abilities: [
      {
        name: '[Ability]',
        description:
          'You can use the [Attack] and [Dodge] hand cards interchangeably',
      }
    ]
  },
  {
    id: 'ma-chao',
    name: 'Ma Chao',
    title: 'Judgement for Forced Damage',
    kingdom: 'shu',
    health: 4,
    abilities: [
      {
        name: '[Enforced Ability]',
        description:
          'Your distance to other players is always reduced by 1',
        tags: ['-1 horse'],
      },
      {
        name: '[Ability]',
        description:
          'When you use an [Attack] on another player, you can flip a judgement card. If the judgement card is red-suited, the targeted player cannot use [Dodge]',
      }
    ]
  },
  {
    id: 'huang-yueying',
    name: 'Huang Yueying',
    title: 'Tool Card Chick',
    kingdom: 'shu',
    health: 3,
    abilities: [
      {
        name: '[Ability]',
        description:
          'Whenever you use a non-time-delayed Tool card, you can immediately draw a card first',
      },
      {
        name: '[Ability]',
        description:
          'The Tool cards that you use have no range restrictions',
      }
    ]
  },
  {
    id: 'huang-zhong',
    name: 'Huang Zhong',
    title: 'Conditional Forced Damage',
    kingdom: 'shu',
    health: 4,
    abilities: [
      {
        name: '[Ability]',
        description:
          'When you use an [Attack] on another player, if any of the following conditions are met, the targeted player cannot use [Dodge]:\n' +
          '1. Your attack range is greater than or equal to the targeted player\'s hand card count (his bow of attack range 5 guarantees)\n' +
          '2. Your current health is less than or equal to the targeted player\'s hand card count (being at 1 health guarantees)',
      }
    ]
  },
  {
    id: 'wei-yan',
    name: 'Wei Yan',
    title: 'Vampire / Bloodsucker',
    kingdom: 'shu',
    health: 4,
    abilities: [
      {
        name: '[Enforced Ability]',
        description:
          'At any time, for every 1 point of damage you cause to another player in your physical range, you gain 1 health',
        tags: ['enforced', 'heal']
      }
    ]
  },
  {
    id: 'pang-tong',
    name: 'Pang Tong',
    title: 'Second Life',
    kingdom: 'shu',
    health: 3,
    abilities: [
      {
        name: '[Enforced Ability]',
        description:
          'During your action phase, you can treat any clubs-suited hand card as [Chains]',
      },
      {
        name: '[One-Time Use Ability]',
        description:
          'When you are on the brink of death, you can discard all your cards, draw 3 new cards and revive with 3 health',
        tags: ['one-time use']
      }
    ]
  },
  {
    id: 'young-zhuge-liang',
    name: 'Zhuge Liang',
    title: 'Young Steve',
    kingdom: 'shu',
    health: 3,
    abilities: [
      {
        name: '[Enforced Ability]',
        description:
          'When you have no armour equipment placed down, by default you have the [Judgement Shield]',
        tags: ['enforced'],
      },
      {
        name: '[Ability]',
        description:
          'During your action phase, you can use any red-suited hand card as [Blaze]',
      },
      {
        name: '[Ability]',
        description:
          'You can use any black-suited hand card as [Void]',
      }
    ]
  },
  {
    id: 'meng-huo',
    name: 'Meng Huo',
    title: 'Elephants King',
    kingdom: 'shu',
    health: 4,
    abilities: [
      {
        name: '[Enforced Ability]',
        description:
          '[Elephants] have no effect on you and you are the source of any damage [Elephants] cause',
        tags: ['enforced'],
      },
      {
        name: '[Ability]',
        description:
          'At the beginning of your turn, if you are not at full health, you can give up your drawing phase and instead flip over X cards from the deck (X being the amount of life you are down).\n' +
          'For each heart-suited card flipped, you heal 1 health and that card is then discarded. All other suited cards go to your hand.',
        tags: ['heal']
      },
    ]
  },
  {
    id: 'zhu-rong',
    name: 'Zhu Rong',
    title: 'Elephants Queen',
    kingdom: 'shu',
    health: 4,
    abilities: [
      {
        name: '[Enforced Ability]',
        description:
          '[Elephants] have no effect on you.\n' +
          'When another player\'s [Elephants] is resolved and enters the discard pile, you receive the card into your hand instead',
        tags: ['enforced'],
      },
      {
        name: '[Ability]',
        description:
          'Every instance your [Attack] causes damage on a player, you can points duel that player. If you win the points duel, you can take a card from that player into your hand',
      },
    ]
  },
  {
    id: 'jiang-wei',
    name: 'Jiang Wei',
    title: 'Attack Me!',
    kingdom: 'shu',
    health: 4,
    abilities: [
      {
        name: '[Ability]',
        description:
          'Once per turn, during your action phase, you can select another player who has the attack range to hit you to play an [Attack] on you.' +
          'If they fail to do so, then you can discard a card from the player',
      },
      {
        name: '[Awakening Ability]',
        description:
          'At the beginning of your turn, if you have no hand cards, you awaken by decreasing max health by 1, then either:\n' +
          '1. Gain 1 unit of health\n' +
          '2. Draw 2 cards\n' +
          '---\n' +
          'You then gain Zhuge Liang (Old Steve)\'s ability:\n' +
          'At the beginning of your turn (before any phases), you can look at X number of cards at the top of the deck (X being the number of players alive, capped at 5) and re-arrange them in any order, and/or place any number of them to the bottom of the deck',
        tags: ['awakening'],
      },
    ]
  },
  {
    id: 'liu-shan',
    name: 'Liu Shan',
    title: 'Young Red King',
    kingdom: 'shu',
    health: 3,
    abilities: [
      {
        name: '[Enforced Ability]',
        description:
          'When another player targets you with an [Attack], they must also discard a basic card, otherwise the [Attack] has no effect',
        tags: ['enforced'],
      },
      {
        name: '[Ability]',
        description:
          'You can skip your action phase. If you do so, then at the end of your turn (after discard phase), you can discard a hand card to let another player take an extra turn immediately after.\n' +
          'Play resumes normally after with the person to your right.',
      },
      {
        name: '[King Ability, Awakening Ability]',
        description:
          'At the beginning of your turn, if you have among the least amount of health (can be tied for lowest), you awaken by increasing max health by 1 and also heal 1 unit of health\n' +
          '---\n' +
          'You then gain Liu Bei (The Red King)\'s ability:\n' +
          'Another Shu character may play an [Attack] on your behalf',
        tags: ['awakening', 'king'],
      },
    ]
  },
  {
    id: 'fa-zheng',
    name: 'Fa Zheng',
    kingdom: 'shu',
    health: 3,
    abilities: [
      {
        name: '[Ability]',
        description:
          'Whenever you receive 2 or more cards from another player, you can let them draw a card.\n' +
          'For each point of damage received, you can force the player that caused it to give you 1 card or lose 1 health',
      },
      {
        name: '[Ability]',
        description:
          'During your drawing phase, you can give up drawing and instead force another player to draw two cards instead. You then also force that player to play [Attack] on another player of your choosing within their attack range.\n' +
          'If they fail to attack, then you can take 2 cards from that player into your hand',
      },
    ]
  },
  {
    id: 'ma-su',
    name: 'Ma Su',
    title: 'Lose All Cards on Kill',
    kingdom: 'shu',
    health: 3,
    abilities: [
      {
        name: '[Ability]',
        description:
          'During your action phase, if the number of hand cards exceed your max health, you can look at the top 3 cards of the deck.\n' +
          'You can choose to reveal any heart-suited cards before placing them in your hand.\n' +
          'You can also re-arrange the cards, but they must be placed back to the top of the deck.',
      },
      {
        name: '[Enforced Ability]',
        description:
          'The player who kills you loses all their cards',
        tags: ['enforced']
      },
    ]
  },
  {
    id: 'xu-shu',
    name: 'Xu Shu',
    kingdom: 'shu',
    health: 3,
    abilities: [
      {
        name: '[Enforced Ability]',
        description:
          'You can not deal or receive damage from Tool cards',
        tags: ['enforced']
      },
      {
        name: '[Ability]',
        description:
          'At the end of your turn (after discard phase), you can discard a non-basic card and then select another player. They can choose to either:\n' +
          '1. Draw 2 cards\n' +
          '2. Heal 1 health\n' +
          '3. Restore their Character Card to normal orientation (not flipped and not chained)',
      },
    ]
  },
]
