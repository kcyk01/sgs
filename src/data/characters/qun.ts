import type {Character} from '../../types/character'

/**
 * Qun characters. One file per kingdom — see ./index.ts for how they are
 * combined and for the conventions every entry follows.
 */
export const qun: Character[] = [
  {
    id: 'hua-tuo',
    name: 'Hua Tuo',
    title: 'Healer',
    kingdom: 'qun',
    health: 3,
    cardPack: 'base',
    gender: 'M',
    abilities: [
      {
        name: '[Ability]',
        description:
          'Outside of your turn, any red-suited card can be used as [Peach]',
        tags: ['heal']
      },
      {
        name: '[Ability]',
        description:
          'Once per turn, during your action phase, you can discard any hand card and choose any player (including yourself) to heal 1 health',
        tags: ['heal']
      }
    ],
  },
  {
    id: 'lu-bu',
    name: 'Lu Bu',
    kingdom: 'qun',
    health: 4,
    cardPack: 'base',
    gender: 'M',
    abilities: [
      {
        name: '[Enforced Ability]',
        description:
          'Whenever you use an [Attack] on a target, they must use two [Dodge] to negate instead of one\n' +
          'Whenever, you are participating in a [Duel], your opponent must use two [Attack] instead of one',
        tags: ['enforced'],
      }
    ],
  },
  {
    id: 'diao-chan',
    name: 'Diao Chan',
    title: 'Makes Two Guys Duel',
    kingdom: 'qun',
    health: 3,
    cardPack: 'base',
    gender: 'F',
    abilities: [
      {
        name: '[Ability]',
        description:
          'Once per turn, during your action phase, you can make 2 male characters participate in a [Duel] (this cannot be negated with a [Void]).\n' +
          '"X duels Y" implies X played the [Duel] against Y, so Y has to respond with the [Attack] first',
      },
      {
        name: '[Ability]',
        description:
          'At the end of your turn (after discard phase), you can draw a card from the deck',
      }
    ],
    variants: [
      {id: 'diao-chan-2', label: 'Alternate Art'},
      {id: 'diao-chan-3', label: 'Alternate Art'}
    ]
  },
  {
    id: 'zhang-jiao',
    name: 'Zhang Jiao',
    title: 'Lightning Guy',
    kingdom: 'qun',
    health: 3,
    cardPack: 'wind 風',
    gender: 'M',
    abilities: [
      {
        name: '[Ability]',
        description:
          'Whenever you use or play a [Dodge], you can immediately flip a judgement card and choose another target player.\n' +
          'If the judgement card is spade-suited, the targeted player takes 2 lightning damage from you',
        tags: ['judgement']
      },
      {
        name: '[Ability]',
        description:
          'Before any judgement card takes effect, you can use any of your black-suited card to exchange the judgement card. The original judgement card that you swapped for goes into your hand',
        tags: ['judgement']
      },
      {
        name: '[King Ability]',
        description:
          'Other characters from Qun / Other can give you one [Dodge] or [Lightning] during their turn',
        tags: ['king']
      }
    ],
    variants: [
      {id: 'zhang-jiao-2', label: 'Alternate Art'}
    ]
  },
  {
    id: 'yu-ji',
    name: 'Yu Ji',
    title: 'Liar',
    kingdom: 'qun',
    health: 3,
    cardPack: 'wind 風',
    gender: 'M',
    abilities: [
      {
        name: '[Ability]',
        description:
          'Whenever you wish to play a Basic or non-time-delayed Tool card, you can choose to play the card face-down and claim that the card is what you say it to be.\n' +
          'In sequential order of players, each player can choose to doubt or not. After all players have made their choice:\n' +
          'If no one doubts, the card is played as you claimed and revealed.\n' +
          'If someone doubts, the card will be revealed:\n' +
          '1. If the card was a lie, anyone who correctly doubted can immediately draw a card from the deck.\n' +
          '2. If the card was a truth, anyone who incorrectly doubted must self-inflict 1 health.\n' +
          'If the truthful card is also heart-suited, then the card can still be played as you had claimed, otherwise all other suited cards have no effect',
      }
    ],
    variants: [
      {id: 'yu-ji-2', label: 'Alternate Art'}
    ]
  },
  {
    id: 'yuan-shao',
    name: 'Yuan Shao',
    title: 'Arrows',
    kingdom: 'qun',
    health: 4,
    cardPack: 'fire 火',
    gender: 'M',
    abilities: [
      {
        name: '[Ability]',
        description:
          'You can use two hand cards of the same suit as [Arrows]',
      },
      {
        name: '[King Ability, Enforced Ability]',
        description:
          'For every character in play that is from Qun / Other, the maximum number of hand cards you can hold increases by 2',
        tags: ['king', 'enforced']
      }
    ]
  },
  {
    id: 'yan-liang-wen-chou',
    name: 'Yan Liang & Wen Chou',
    title: 'Dueler',
    kingdom: 'qun',
    health: 4,
    cardPack: 'fire 火',
    gender: 'M',
    abilities: [
      {
        name: '[Ability]',
        description:
          'During your drawing phase, you can give up drawing and instead flip a judgement card.\n' +
          'Every hand card that is different from the suit colour of the judgement card can be now used as a [Duel]',
        tags: ['judgement']
      }
    ]
  },
  {
    id: 'pang-de',
    name: 'Pang De',
    title: 'Dodge and Get Bridged',
    kingdom: 'qun',
    health: 4,
    cardPack: 'fire 火',
    gender: 'M',
    abilities: [
      {
        name: '[Enforced Ability]',
        description:
          'Your distance to other players is always reduced by 1',
        tags: ['enforced', '-1 horse'],
      },
      {
        name: '[Ability]',
        description:
          'Whenever you [Attack] a target and they use [Dodge] to negate, you can discard any card from that player',
      }
    ]
  },
  {
    id: 'dong-zhuo',
    name: 'Dong Zhuo',
    kingdom: 'qun',
    health: 8,
    cardPack: 'forest 林',
    gender: 'M',
    abilities: [
      {
        name: '[Ability]',
        description:
          'You can use any spades-suited hand card as [Wine]',
      },
      {
        name: '[Enforced Ability]',
        description:
          'Whenever you target a female character, or a female character targets you with an [Attack], two [Dodge] are needed to negate instead of one',
        tags: ['enforced']
      },
      {
        name: '[Enforced Ability]',
        description:
          'At the end of your turn, if you are not the lowest (or among the lowest) health, you must do one of the following:\n' +
          '1. Lose 1 health\n' +
          '2. Decrease your max health by 1',
        tags: ['enforced']
      },
      {
        name: '[King Ability]',
        description:
          'Every instance another character from Qun / Other deals damage, they can choose to let you flip a judgement card.\n' +
          'If the judgement is spades-suited, you can heal 1 health',
        tags: ['king', 'judgement', 'heal']
      }
    ]
  },
  {
    id: 'jia-xu',
    name: 'Jia Xu',
    title: 'No One Else Can Peach',
    kingdom: 'qun',
    health: 3,
    cardPack: 'forest 林',
    gender: 'M',
    abilities: [
      {
        name: '[Enforced Ability]',
        description:
          'During your turn, only you or the player on the brink of death can use [Peach] to save themselves',
        tags: ['enforced'],
      },
      {
        name: '[One-Time Use Ability]',
        description:
          'During your action phase, you can force every other player to do one of the following:\n' +
          '1. Attack the nearest player (must be able to reach them) with an [Attack]\n' +
          '2. Self-inflict 1 health',
        tags: ['one-time use']
      },
      {
        name: '[Enforced Ability]',
        description:
          'You cannot be the target of any black-suited Tool cards',
        tags: ['enforced'],
      }
    ]
  },
  {
    id: 'zuo-ci',
    name: 'Zuo Ci',
    title: 'Shapeshifter',
    kingdom: 'qun',
    health: 3,
    cardPack: 'mountain 山',
    gender: 'M',
    abilities: [
      {
        name: '[Ability]',
        description:
          'At the beginning of the game, you get 2 unused Character cards. You can pick 1 ability from a Character card that you have (non-awakening, non-king, and non-one-time use).\n' +
          'You will then reveal the Character and assume the gender, kingdom, and that one ability you chose.\n' +
          'Once before and once after your turn, you can change that single ability (again from any Character you have), and assume that Character\'s gender and kingdom.\n' +
          'All revealed Character cards stay face-up.',
      },
      {
        name: '[Ability]',
        description:
          'For every point of damage you take, you can get another unused Character card',
      }
    ]
  },
  {
    id: 'cai-wenji',
    name: 'Cai Wenji',
    title: 'Lose Abilities on Kill',
    kingdom: 'qun',
    health: 3,
    cardPack: 'mountain 山',
    gender: 'F',
    abilities: [
      {
        name: '[Ability]',
        description:
          'Whenever a player (including yourself) receives damage from an [Attack], you can discard any card and flip a judgement card:\n' +
          '1. If it is hearts-suited, the player who was damaged receives 1 health\n' +
          '2. If it is diamonds-suited, the player who was damaged can draw 2 cards from the deck\n' +
          '3. If it is clubs-suited, the player who attacked must discard 2 cards\n' +
          '4. If it is spades-suited, the player who attacked must flip their character card',
        tags: ['heal', 'flip']
      },
      {
        name: '[Enforced Ability]',
        description:
          'The player who kills you loses all their abilities for the rest of the game',
        tags: ['enforced']
      }
    ]
  },
  {
    id: 'chen-gong',
    name: 'Chen Gong',
    kingdom: 'qun',
    health: 3,
    cardPack: 'OKF 2011 將',
    gender: 'M',
    abilities: [
      {
        name: '[Ability]',
        description:
          'Once per turn, during your action phase, you can give an [Attack] or an Equipment to another player and ask them to either:\n' +
          '1. Attack another target of your choosing (within their attack range)\n' +
          '2. Draw a card',
      },
      {
        name: '[Enforced Ability]',
        description:
          'Outside of your turn, whenever you are damaged, any [Attack] and non-time-delayed Tool cards will have no effect on you for the rest of that turn',
        tags: ['enforced']
      }
    ]
  },
  {
    id: 'gao-shun',
    name: 'Gao Shun',
    kingdom: 'qun',
    health: 4,
    cardPack: 'OKF 2011 將',
    gender: 'M',
    abilities: [
      {
        name: '[Ability]',
        description:
          'Once per turn, during your action phase, you can choose to points duel another player.\n' +
          'If you win, then you can use unlimited number of [Attack] on that player, and your [Attack] ignores their Armour Equipment and has no range restrictions.\n' +
          'If you lose, you cannot attack for the rest of your turn',
        tags: ['points duel']
      },
      {
        name: '[Enforced Ability]',
        description:
          'Your [Wine] cards are always viewed as [Attack]',
        tags: ['enforced']
      }
    ]
  }
]
