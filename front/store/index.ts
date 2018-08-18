export const state = () => ({
  language: 'ko',
})

export const mutations = {
  changeLang(state) {
    if (state.language === 'ko') {
      state.language = 'en'
    } else {
      state.language = 'ko'
    }
  },
}
