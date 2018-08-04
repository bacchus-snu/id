<template>
  <div>
    <el-card>
      <el-row :gutter="12">
        <el-col :span="12">
          <el-card>
            <el-table
              :data="userData"
              empty-text="No Data">
              <el-table-column
                v-for="col in fields"
                :prop="col"
                :label="col"
                :key="col">
              </el-table-column>
            </el-table>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card>
            <span>username</span>
            <el-input v-model="username" size="small"/>
            <span>name</span>
            <el-input v-model="name" size="small"/>
            <span>password</span>
            <el-input v-model="password" size="small"/>
            <span>emailLocal</span>
            <el-input v-model="emailLocal" size="small"/>
            <span>emailDomain</span>
            <el-input v-model="emailDomain" size="small"/>
          </el-card>
        </el-col>
      </el-row>
      <el-row class="button-container">
        <el-col :offset="23" :span="1">
          <el-button @click="addUser" type="primary">Add</el-button>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'nuxt-property-decorator'
import axios from 'axios'
import { AxiosResponse } from 'axios'
import { User, userFields } from '~/types/User'

@Component({})
export default class UserAdminTable extends Vue {
  public userData: Array<User> = []
  public fields: Array<string> = userFields

  public username: string = ''
  public name: string = ''
  public password: string = ''
  public emailLocal: string = ''
  public emailDomain: string = ''

  async mounted(): Promise<void> {
    this.userData = await this.fetchUsers()
  }

  async fetchUsers(): Promise<Array<User>> {
    const response = await axios.get('/api/user')
    return response.data
  }

  async addUser() {
    if (!this.username || !this.name ||
      !this.password || !this.emailLocal || !this.emailDomain) {
      this.$notify.error('Field error!')
      return
    }

    let response = await axios.post('/api/user', {
      username: this.username,
      name: this.name,
      password: this.password,
      emailLocal: this.emailLocal,
      emailDomain: this.emailDomain
    })

    this.clearFields()

    if (response.status !== 201) {
      this.$notify.error('Request error!')
    }

    this.userData = await this.fetchUsers()
  }

  clearFields() {
    this.username = ''
    this.name = ''
    this.password = ''
    this.emailLocal = ''
    this.emailDomain = ''
  }

}
</script>
<style scoped>
.button-container {
  margin-top: 20px;
}
</style>
