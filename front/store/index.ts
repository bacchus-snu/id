export const state = () => ({
  language: 'ko',
  username: '',
})

export const mutations = {
  changeLang(state) {
    if (state.language === 'ko') {
      state.language = 'en'
    } else {
      state.language = 'ko'
    }
  },

  changeUsername(state, username: string) {
    state.username = username
  },
}
