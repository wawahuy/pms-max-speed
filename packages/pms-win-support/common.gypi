{
  'defines': [ 'V8_DEPRECATION_WARNINGS=1' ],
  'conditions': [
    [ 'OS in "win"', {
      'cflags': ['-Wno-cast-function-type'],
    }],
  ],
}