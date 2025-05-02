export default (token) => {
    switch(true) {
        case token.startsWith("glcbt-"):
          return "JOB-TOKEN"
        default:
          return "PRIVATE-TOKEN"
      }
};