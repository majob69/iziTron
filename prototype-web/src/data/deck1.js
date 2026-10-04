// Deck 1 als Kachelkarte (eine Kachel = TILE Meter).
//  ' ' Abgrund   '#' Boden   '=' Steg (schmal)   'G' Stromgitter (Schaden, außer Schweben)
//  'X' Pfeiler   'T' Werkstatt-Terminal   'S' Start Klix
//  '1' Putzdroide 123   '3' Lastdroide 349   '5' Wachdroide 516

export const DECK1 = {
  name: 'Deck 1 – Förderebene',
  map: [
    '                              ',
    ' ########       ###########   ',
    ' ##S#####       ####1######   ',
    ' ########=======#####GGG###   ',
    ' ###T####       ###########   ',
    ' ########          ##         ',
    '    ##             ##         ',
    '    ##         ##########     ',
    '    ##         ###3######     ',
    ' ########======##########     ',
    ' ###1####      ####X#####     ',
    ' ########      ##########     ',
    '    ##             ##         ',
    '    ##             =          ',
    '    ##             =          ',
    ' ###########   ############   ',
    ' ####5######===####GG#5###    ',
    ' ####X######   ####GG##T##    ',
    ' ###########   ############   ',
    '                              ',
  ],
};
