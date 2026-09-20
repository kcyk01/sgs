import type {Character} from '../../types/character'

/**
 * Wu characters. One file per kingdom — see ./index.ts for how they are
 * combined and for the conventions every entry follows.
 */
export const wu: Character[] = [
  {
    id: 'sun-quan',
    name: 'Sun Quan',
    title: 'Peach King',
    kingdom: 'wu',
    health: 4,
    cardPack: 'base',
    gender: 'M',
    abilities: [
      {
        name: '[Ability]',
        description:
          'Once per turn, during your action phase, you can discard any number of your cards, and draw the same amount from the deck.',
      },
      {
        name: '[King Ability, Enforced Ability]',
        description:
          'Whenever another character from the Wu kingdom uses a [Peach] to save you from the brink of death, the [Peach] heals for an additional health',
        tags: ["king", "enforced"]
      }
    ],
  },
  {
    id: 'gan-ning',
    name: 'Gan Ning',
    title: 'Black Cards are Bridge',
    kingdom: 'wu',
    health: 4,
    cardPack: 'base',
    gender: 'M',
    abilities: [
      {
        name: '[Ability]',
        description:
          'During your action phase, you can use any of your black-suited card as [Bridge]',
      }
    ],
    searchTerms: 'abs'
  },
  {
    id: 'lu-meng',
    name: 'Lu Meng',
    title: 'Camper',
    kingdom: 'wu',
    health: 4,
    cardPack: 'base',
    gender: 'M',
    abilities: [
      {
        name: '[Ability]',
        description:
          'If you do not use or play an [Attack] during your action phase, you can skip the discard phase',
      }
    ],
  },
  {
    id: 'huang-gai',
    name: 'Huang Gai',
    title: 'Cutter',
    kingdom: 'wu',
    health: 4,
    cardPack: 'base',
    gender: 'M',
    abilities: [
      {
        name: '[Ability]',
        description:
          'During your action phase, you can repeatedly choose to self inflict 1 damage to draw 2 cards',
      }
    ],
  },
  {
    id: 'zhou-yu',
    name: 'Zhou Yu',
    title: 'Guessing Game',
    kingdom: 'wu',
    health: 3,
    cardPack: 'base',
    gender: 'M',
    abilities: [
      {
        name: '[Ability]',
        description:
          'During your drawing phase, you can draw 1 additional card',
      },
      {
        name: '[Ability]',
        description:
          'Once per turn, when you have at least one hand card during your action phase, you can choose another player to guess a suit. They then pick a card from your hand and revealed to everyone.\n' +
          'If the suit is not what the player guessed, they will take 1 damage. After the damage is resolved, that player can then keep the chosen card.',
      }
    ],
  },
  {
    id: 'da-qiao',
    name: 'Da Qiao',
    title: 'Diamonds are Skip Action Phase',
    kingdom: 'wu',
    health: 3,
    cardPack: 'base',
    gender: 'F',
    abilities: [
      {
        name: '[Ability]',
        description:
          'During your action phase, you can use any diamond-suited card as [Skip Action Phase]',
      },
      {
        name: '[Ability]',
        description:
          'Whenever you are the target of an [Attack], you can discard one of your cards and redirect the attack to another player (not back to the attacker) within your attack range',
      }
    ],
  },
  {
    id: 'lu-xun',
    name: 'Lu Xun',
    title: 'No Steal or Skip Action Phase',
    kingdom: 'wu',
    health: 3,
    cardPack: 'base',
    gender: 'M',
    abilities: [
      {
        name: '[Enforced Ability]',
        description:
          'You can not be the target of [Steal] and [Skip Action Phase]',
        tags: ['enforced'],
      },
      {
        name: '[Ability]',
        description:
          'Whenever you lose your last hand card, you can draw a card',
      }
    ],
  },
  {
    id: 'sun-shangxiang',
    name: 'Sun Shangxiang',
    title: 'Jugs',
    kingdom: 'wu',
    health: 3,
    cardPack: 'base',
    gender: 'F',
    abilities: [
      {
        name: '[Ability]',
        description:
          'Once per turn, during your action phase, you can discard 2 hand cards and choose an injured male character for both of you to heal 1 health each',
        tags: ['heal']
      },
      {
        name: '[Ability]',
        description:
          'For each Equipment that that is moved from your equipped Equipment area, you can draw 2 cards',
      }
    ],
  },
  {
    id: 'xiao-qiao',
    name: 'Xiao Qiao',
    title: 'Spades are Hearts',
    kingdom: 'wu',
    health: 3,
    cardPack: 'wind 風',
    gender: 'F',
    abilities: [
      {
        name: '[Ability]',
        description:
          'Whenever you are to receive damage, you can instead discard a heart-suited hand card and pick another player to receive the damage instead.\n' +
          'After the damage is calculated, they receive X cards from the deck (X being amount of health they are down)',
      },
      {
        name: '[Enforced Ability]',
        description:
          'All of your spades-suited cards are considered hearts-suited',
        tags: ['enforced'],
      }
    ],
  },
  {
    id: 'zhou-tai',
    name: 'Zhou Tai',
    title: 'Zombie',
    kingdom: 'wu',
    health: 4,
    cardPack: 'wind 風',
    gender: 'M',
    abilities: [
      {
        name: '[Ability]',
        description:
          'Whenever you are on the brink of death, you can flip a card from the deck and place it on your character card. Each additional point of damage will flip another card.\n' +
          'If any two cards on your character have the same number, you will die if not saved.\n' +
          'Whenever you are healed, each health point allows you to discard one of these cards from your character card',
      }
    ],
    variants: [
      {id: 'zhou-tai-2', label: 'Alternate Art'},
    ]
  },
  {
    id: 'taishi-ci',
    name: 'Tai Shi Ci',
    kingdom: 'wu',
    health: 4,
    cardPack: 'fire 火',
    gender: 'M',
    abilities: [
      {
        name: '[Ability]',
        description:
          'Once per turn, during your action phase, you can points duel any other player.\n' +
          'If you win, then you can play an additional [Attack] this turn, all your [Attack] cards can have an additional target and not require attack range\n' +
          'If you lose, you cannot attack the rest of this turn',
        tags: ['points duel']
      }
    ],
  },
  {
    id: 'sun-jian',
    name: 'Sun Jian',
    kingdom: 'wu',
    health: 4,
    cardPack: 'forest 林',
    gender: 'M',
    abilities: [
      {
        name: '[Ability]',
        description:
          'Once per turn, at the beginning of your turn (before judgement phase), if you are not at full health, you can choose a target player to do one of the following:\n' +
          '1. Draw X cards from the deck, discard 1 card\n' +
          '2. Draw 1 card from the deck, discard X cards\n' +
          'X being the number of health points lost',
      }
    ],
  },
  {
    id: 'lu-su',
    name: 'Lu Su',
    title: 'Hand Swap Guy',
    kingdom: 'wu',
    health: 3,
    cardPack: 'forest 林',
    gender: 'M',
    abilities: [
      {
        name: '[Ability]',
        description:
          'During your draw phase, you can choose to draw 2 additional cards.\n' +
          'If you end up with more than 5 cards, you must give half (rounded down) to another player who has the least (or among the least) number of hand cards.',
      },
      {
        name: '[Ability]',
        description:
          'Once per turn, during your action phase, you can force 2 other players to exchange their hands card by discarding X of your hand cards (X being the number of cards difference between those 2 players)',
      }
    ],
  },
  {
    id: 'sun-ce',
    name: 'Sun Ce',
    title: 'Red Attack / Duel King',
    kingdom: 'wu',
    health: 3,
    cardPack: 'mountain 山',
    gender: 'M',
    abilities: [
      {
        name: '[Ability]',
        description:
          'Whenever you use or are the target of [Duel] or a red-suited [Attack], you can immediately draw a card',
      },
      {
        name: '[Awakening Ability]',
        description:
          'At the beginning of your turn, if you are at 1 health, you awaken by decreasing your max health by 1\n' +
          '---\n' +
          'You then gain Zhou Yu\'s ability:\n' +
          'During your drawing phase, you can draw 1 additional card\n' +
          '---\n' +
          'You also gain Sun Jian\'s ability:\n' +
          'Once per turn, at the beginning of your turn (before judgement phase), if you are not at full health, you can choose a target player to do one of the following:\n' +
          '1. Draw X cards from the deck, discard 1 card\n' +
          '2. Draw 1 card from the deck, discard X cards\n' +
          'X being the number of health points lost',
        tags: ['awakening']
      },
      {
        name: '[King Ability]',
        description:
          'Other characters of the Wu kingdom can choose to points duel you.\n' +
          'If you win, you can get both of the cards used in the points duel.\n' +
          'After awakening, you have the option to refuse points duel.',
        tags: ['king', 'points duel']
      }
    ],
  },
  {
    id: 'zhang-zhao-zhang-hong',
    name: 'Zhang Zhao & Zhang Hong',
    title: 'Discard Card Salvager',
    kingdom: 'wu',
    health: 3,
    cardPack: 'mountain 山',
    gender: 'M',
    abilities: [
      {
        name: '[Ability]',
        description:
          'During your action phase, you can place Equipment cards on other players (cannot replace an existing Equipment card), afterwards you can draw a card from the deck',
      },
      {
        name: '[Ability]',
        description:
          'At the end of another player\'s discard phase, you can return 1 of the discarded cards back to that player and take the rest of the discarded cards into your hand',
      }
    ],
  },
  {
    id: 'ling-tong',
    name: 'Ling Tong',
    kingdom: 'wu',
    health: 4,
    cardPack: 'OKF 2011 將',
    gender: 'M',
    abilities: [
      {
        name: '[Ability]',
        description:
          'Every instance Equipment is moved from your equipped Equipment area, or whenever you discard 2 or more cards during your discard phase, you can discard up to 2 cards in total from other players (not limited to the same player)',
      }
    ],
    searchTerms: 'abs'
  },
  {
    id: 'wu-guotai',
    name: 'Wu Guotai',
    title: 'Equipment Swapper',
    kingdom: 'wu',
    health: 3,
    cardPack: 'OKF 2011 將',
    gender: 'F',
    abilities: [
      {
        name: '[Ability]',
        description:
          'Once per turn, during your action phase, you can force 2 other players to swap all of their Equipments, provided the difference in number of Equipments between the two players is less than or equal to how much health you\'ve lost',
      },
      {
        name: '[Ability]',
        description:
          'When any player (including yourself) is on the brink of death, you can reveal 1 hand card of that player.\n' +
          'If the revealed card is a non-basic card, then it is discarded and the player heals 1 life',
        tags: ['heal']
      }
    ],
  },
  {
    id: 'xu-sheng',
    name: 'Xu Sheng',
    kingdom: 'wu',
    health: 4,
    cardPack: 'OKF 2011 將',
    gender: 'M',
    abilities: [
      {
        name: '[Ability]',
        description:
          'Every time your [Attack] causes damage to another player, you can make the target player draw X cards (X being the amount of health left after damage is resolved, capped at 5), and then that player must flip their character card',
        tags: ['flip']
      }
    ],
  },
  {
    id: 'bu-lianshi',
    name: 'Bu Lianshi',
    kingdom: 'wu',
    health: 3,
    cardPack: 'OKF 2012 將',
    gender: 'F',
    abilities: [
      {
        name: '[Ability]',
        description:
          'Once per turn, during your action phase, you can pick two players with different number of hand cards.\n' +
          'The player with less cards takes and reveals a card from the player with more cards.\n' +
          'If the card is not spades-suited, you can draw a card.',
      },
      {
        name: '[Ability]',
        description:
          'When you are killed, you can choose a player (not the one who killed you), and let them draw 3 cards and heal 1 life',
        tags: ['heal', 'on-death']
      }
    ],
  },
  {
    id: 'cheng-pu',
    name: 'Cheng Pu',
    kingdom: 'wu',
    health: 4,
    cardPack: 'OKF 2012 將',
    gender: 'M',
    abilities: [
      {
        name: '[Ability]',
        description:
          'You can always use your normal [Attack] as [Fire Attack]. If you do so and the [Fire Attack] does damage, you will lose 1 health.\n' +
          'All of your [Fire Attack] can have one additional target',
      },
      {
        name: '[Ability]',
        description:
          'At the end of your turn (after discard phase), if you have no "Alcohol" on your character card, you can place any number of [Attack] type cards on it as "Alcohol".\n' +
          'When any player is on the brink of death, you can discard an "Alcohol" and it would have acted as the player on the brink of death having used a [Wine]',
        tags: ['heal']
      }
    ],
  },
  {
    id: 'han-dang',
    name: 'Han Dang',
    kingdom: 'wu',
    health: 4,
    cardPack: 'OKF 2012 將',
    gender: 'M',
    abilities: [
      {
        name: '[Ability]',
        description:
          'Once per turn, during your action phase, you can discard any card to make your attack range unlimited distance for the rest of your turn.\n' +
          'If the discarded card is also an Equipment card, you can discard another player\'s card',
      },
      {
        name: '[One-Time Use Ability]',
        description:
          'During your action phase, you can pick any player. Every other player that can target your selected player in their attack range must either:\n' +
          '1. Discard a weapon card\n' +
          '2. Let the selected player draw a card',
        tags: ['one-time use']
      }
    ],
  },
]
