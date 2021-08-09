<template>
  <el-card class="change-password">
  <div slot="header" class="card-head">
    <span>Change password</span>
  </div>
  <el-form @submit.native.prevent="submitForm" :model="models" status-icon size="medium" ref="changePasswordForm" :rules="rules" label-width="150px">
    <el-form-item :label="newPasswordTrans[lang]" prop="newPassword">
      <el-input type="password" v-model="models.newPassword"></el-input>
    </el-form-item>
    <el-form-item :label="retypePasswordTrans[lang]" prop="retypePassword">
      <el-input type="password" v-model="models.retypePassword"></el-input>
    </el-form-item>
  </el-form>
  <el-button class="button" type="warning" @click="submitForm">{{ changePasswordTrans[lang] }}</el-button>
  </el-card>
</template>

<script lang="ts">
import { Component, Vue, Provide } from 'nuxt-property-decorator'
import { Translation, Language } from '../types/translation'

@Component({})
export default class ChangePassword extends Vue {
  private readonly newPasswordTrans: Translation = {
    ko: '새 비밀번호',
    en: 'Current password',
  }
  private readonly retypePasswordTrans: Translation = {
    ko: '비밀번호 확인',
    en: 'Retype password',
  }
  private readonly pwdErrorTrans: Translation = {
    ko: '비밀번호가 다릅니다',
    en: 'The password does not match',
  }
  private readonly changePasswordTrans: Translation = {
    ko: '비밀번호 변경',
    en: 'Change password',
  }
  private readonly failTrans: Translation = {
    ko: '비밀번호 변경에 실패하였습니다.',
    en: 'Failed to change password.',
  }
  private readonly lengthErrorTrans: Translation = {
    ko: '비밀번호는 최소 8자리여야 합니다',
    en: 'The password should be at least 8 characters',
  }
  private readonly successTrans: Translation = {
    ko: '비밀번호가 성공적으로 변경되었습니다.',
    en: 'Password changed successfully.',
  }

  @Provide()
  private models = {
    newPassword: '',
    retypePassword: '',
  }

  @Provide()
  private rules = {
    newPassword: [{
      required: true,
      min: 8,
      message: this.lengthErrorTrans[this.lang],
      trigger: 'blur',
    }],
    retypePassword: [{
      required: true,
      validator: this.validatePassword,
      trigger: 'blur',
    }],
  }

  get lang(): Language {
    return this.$store.state.language
  }

  private validatePassword(rule, value, callback) {
    // TODO: more password rules?
    if (value === '') {
      callback(new Error(' '))
    } else if (value !== this.models.newPassword) {
      callback(new Error(this.pwdErrorTrans[this.lang]))
    } else {
      callback()
    }
  }

  private async submitForm() {
    const elementRef = 'changePasswordForm'
    const formElement: any = this.$refs[elementRef]
    formElement.validate(async valid => {
      if (valid) {
        await this.changePassword()
        formElement.resetFields()
      } else {
        return false
      }
    })
  }

  private async changePassword() {
    const token = this.$route.query.token
    const response = await this.$axios.post('/api/user/change-password', {
      newPassword: this.models.newPassword,
      token,
    }, { validateStatus: () => true })

    if (response.status !== 200) {
      this.$notify.error(this.failTrans[this.lang])
      return
    }

    this.$notify.success(this.successTrans[this.lang])
    this.$router.push('/')
  }

}
</script>

<style scoped>
.change-password {
  width: 550px;
  margin-top: 4%;
  margin-left: auto;
  margin-right: auto;
  text-align: center;
}

.button {
  margin-top: 10px;
  width: 80%;
  height: 50px;
  padding: 3px;
  background-color: white;
  border: 2px solid #f2a43e;
  color: black;
  font-size: 16px;
}

.button:hover {
  background-color: #f2a43e;
}

.el-form-item {
  width: 90%;
}

.el-select {
  width: 100%;
}

.card-head {
  font-size: 24px;
}
</style>
