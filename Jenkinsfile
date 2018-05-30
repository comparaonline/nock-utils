pipeline {
    agent any

    stages {
        stage('Prepare') {
          steps {
            sh 'yarn install'
          }
        }
        stage('Build') {
            steps {
                sh 'yarn compile'
            }
        }
        stage('Test') {
            steps {
                sh 'yarn test'
            }
        }
    }

    post {
      always {
        echo 'Done building and testing.'
      }
    }
}
