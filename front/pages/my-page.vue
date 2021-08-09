<template>
  <div>
    <my-page></my-page>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'nuxt-property-decorator'
import MyPage from '~/components/MyPage'

@Component({
  components: {
    'my-page': MyPage,
  },
})
export default class MyAccountPage extends Vue {

}
</script>
