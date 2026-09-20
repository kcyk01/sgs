import type {Character} from '../../types/character'

/**
 * Wei characters. One file per kingdom — see ./index.ts for how they are
 * combined and for the conventions every entry follows.
 */
export const wei: Character[] = [
  {
    id: 'cao-cao',
    name: 'Cao Cao',
    title: 'The Blue King',
    kingdom: 'wei',
    health: 4,
    abilities: [
      {
        name: '[Ability]',
        description:
          'You can get any card(s) that caused damage to you',
      },
      {
        name: '[King Ability]',
        description:
          'Another character from the Wei kingdom may play a [Dodge] on your behalf',
        tags: ['king'],
      },
    ]
  },
  {
    id: 'sima-yi',
    name: 'Sima Yi',
    title: 'Judgement Replacing',
    kingdom: 'wei',
    health: 3,
    abilities: [
      {
        name: '[Ability]',
        description:
          'Every instance you are damaged, you can take a card from the player that damaged you',
      },
      {
        name: '[Ability]',
        description:
          'Before any judgement card takes effect, you can use a hand card to replace the judgement card',
        tags: ['judgement']
      },
    ]
  },
  {
    id: 'xiahou-dun',
    name: 'Xiahou Dun',
    title: 'Judgement Retaliation',
    kingdom: 'wei',
    health: 4,
    abilities: [
      {
        name: '[Ability]',
        description:
          'Every instance you are damaged by another player, you can choose to flip a judgement card.\n' +
          'If the judgement card is not heart-suited, then that player must either take a retaliation damage of 1 health, or discard two cards',
        tags: ['judgement']
      }
    ]
  },
  {
    id: 'zhang-liao',
    name: 'Zhang Liao',
    title: 'Steal Instead of Draw',
    kingdom: 'wei',
    health: 4,
    abilities: [
      {
        name: '[Ability]',
        description:
          'During your draw phase, you can give up drawing and instead choose up to two players (minimum 1), and take 1 hand card from each player instead',
      }
    ]
  },
  {
    id: 'xu-zhu',
    name: 'Xu Zhu',
    title: 'Extra Attack and Duel Damage',
    kingdom: 'wei',
    health: 4,
    abilities: [
      {
        name: '[Ability]',
        description:
          'During your draw phase, you can draw 1 less card. If you do then during your action phase, your [Attack] and [Duel] deal 1 extra damage',
      }
    ]
  },
  {
    id: 'guo-jia',
    name: 'Guo Jia',
    title: 'Keeps Judgements / Cards on Taking Damage',
    kingdom: 'wei',
    health: 3,
    abilities: [
      {
        name: '[Ability]',
        description:
          'After a judgement card has taken effect, you can keep that judgement card in your hand',
        tags: ['judgement']
      },
      {
        name: '[Ability]',
        description:
          'For each point of damage you receive, you can draw 2 cards. You can choose to give any of the drawn cards to any other player.',
      }
    ]
  },
  {
    id: 'zhen-ji',
    name: 'Zhen Ji',
    title: 'Black Cards are Dodge',
    kingdom: 'wei',
    health: 3,
    abilities: [
      {
        name: '[Ability]',
        description:
          'You can use any black-suited hand card as a [Dodge]',
      },
      {
        name: '[Ability]',
        description:
          'Before your judgement phase, you can flip a judgement card. If it is black-suited, you can keep that card.\n' +
          'You can repeat this as many times until the judgement card is red-suited',
        tags: ['judgement']
      }
    ]
  },
  {
    id: 'xiahou-yuan',
    name: 'Xiahou Yuan',
    title: 'Phase Skip for Attacks',
    kingdom: 'wei',
    health: 4,
    abilities: [
      {
        name: '[Ability]',
        description:
          'You can do any (or both) of the following:\n' +
          '1. Skip both your judgement and drawing phase\n' +
          '2. Skip your playing phase and discard an Equipment\n' +
          'For each, doing so will have acted as an [Attack] with unlimited attack range on any other character',
      }
    ]
  },
  {
    id: 'cao-ren',
    name: 'Cao Ren',
    title: 'Flip for Cards',
    kingdom: 'wei',
    health: 4,
    abilities: [
      {
        name: '[Ability]',
        description:
          'At the end of your turn (after discard phase), you can draw 3 cards and then flip your character card',
        tags: ['flip']
      }
    ],
    variants: [
      {id: 'cao-ren-2', label: 'Alternate Art'}
    ]
  },
  {
    id: 'dian-wei',
    name: 'Dian Wei',
    title: 'Cut or Weapon to Damage',
    kingdom: 'wei',
    health: 4,
    abilities: [
      {
        name: '[Ability]',
        description:
          'Once per turn, during your action phase, you can cut 1 health or discard a weapon to deal 1 damage to any other character within your attack range',
      }
    ],
  },
  {
    id: 'xun-yu',
    name: 'Xun Yu',
    title: 'Refill Hand Cards',
    kingdom: 'wei',
    health: 3,
    abilities: [
      {
        name: '[Ability]',
        description:
          'Once per turn, during your action phase, you can points duel another player with more health than you.\n' +
          'If you win, then that player instantly deals 1 damage to another player of your choosing within their attack range\n' +
          'If you lose, then that player deals 1 damage to you',
        tags: ['points duel']
      },
      {
        name: '[Ability]',
        description:
          'For each point of damage taken, you can refill any player\'s (including yourself) hand card count from the deck to match their max health',
      }
    ],
  },
  {
    id: 'xu-huang',
    name: 'Xu Huang',
    title: 'Skip Drawing Phase',
    kingdom: 'wei',
    health: 4,
    abilities: [
      {
        name: '[Ability]',
        description:
          'During your action phase, you can use any black-suited Basic or Equipment card as [Skip Drawing Phase].\n' +
          'You can use [Skip Drawing Phase] on players up to a physical range of 2 (rather than the usual 1)',
      }
    ],
  },
  {
    id: 'cao-pi',
    name: 'Cao Pi',
    title: 'Flipping Blue King',
    kingdom: 'wei',
    health: 3,
    abilities: [
      {
        name: '[Ability]',
        description:
          'You can take all of a dead player\'s cards',
      },
      {
        name: '[Ability]',
        description:
          'Every instance you take damage, you can choose another player to get X cards (X being the amount of life you are down after the damage). That player then flips their character card.',
        tags: ['flip']
      },
      {
        name: '[King Ability]',
        description:
          'Whenever a character from the Wei kingdom flips a black-suited judgement card, they can choose to let you draw a card',
        tags: ['king', 'judgement']
      }
    ],
  },
  {
    id: 'zhang-he',
    name: 'Zhang He',
    title: 'Phase Skipper',
    kingdom: 'wei',
    health: 4,
    abilities: [
      {
        name: '[Ability]',
        description:
          'During your turn, you can discard a hand card to skip any (can do multiple, but must discard 1 card per phase skipped) of the phases:\n' +
          '1. Judgement Phase: no judgement will occur this turn (time-delayed tool cards stay for judgement next turn)\n' +
          '2. Drawing Phase: you can instead select two other players, and take 1 hand card from each player\n' +
          '3. Action Phase: you can move a card on the playing field to another location provided the destination allows that card\n' +
          '4. Discard Phase: you do not need to discard cards',
      }
    ],
  },
  {
    id: 'deng-ai',
    name: 'Deng Ai',
    title: 'Farms',
    kingdom: 'wei',
    health: 4,
    abilities: [
      {
        name: '[Ability]',
        description:
          'Every instance outside your turn you lose any of your cards, you can flip a judgement card.\n' +
          'If the judgement card is not heart-suited, you can place it on your character card as a "Farm".\n' +
          'Every farm you have decreases distance calculation by 1',
        tags: ['judgement']
      },
      {
        name: '[Awakening Ability]',
        description:
          'At the beginning of your turn, if you have 3 or more farms, you awaken by decreasing your max health by 1 and you can now use each "Farm" as a [Steal]',
        tags: ['awakening']
      }
    ],
  },
  {
    id: 'cao-zhi',
    name: 'Cao Zhi',
    title: 'Clubs and Wine',
    kingdom: 'wei',
    health: 3,
    abilities: [
      {
        name: '[Ability]',
        description:
          'When another player\'s club-suited judgement card or discarded card enters the discard pile, you can take it into your hand',
        tags: ['judgement']
      },
      {
        name: '[Ability]',
        description:
          'When your character card is face up, you can flip your character card over to be used as [Wine].\n' +
          'When your character card is face down, taking damage and after damage calculation, you can flip your character card back to face up',
        tags: ['flip']
      }
    ],
  },
  {
    id: 'yu-jin',
    name: 'Yu Jin',
    title: 'Black Attacks Useless',
    kingdom: 'wei',
    health: 4,
    abilities: [
      {
        name: '[Enforced Ability]',
        description:
          'When you have no Armour equipped, any black-suited [Attack] targeted on you has no effect',
        tags: ['enforced']
      }
    ],
  },
  {
    id: 'zhang-chunhua',
    name: 'Zhang Chunhua',
    title: 'All Damage is Self-Cut',
    kingdom: 'wei',
    health: 3,
    abilities: [
      {
        name: '[Enforced Ability]',
        description:
          'All damage caused by you is considered a self-inflicted damage (no retaliation/rewards)',
        tags: ['enforced']
      },
      {
        name: '[Enforced Ability]',
        description:
          'Outside of your discard phase, your hand card count will always be a minimum of X (X being the number of health down, limited to a max of 2)',
        tags: ['enforced']
      }
    ],
  },
]
