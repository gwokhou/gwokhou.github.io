class Solution {
    public void dfs(boolean[][] matrix) {
        boolean[][] isVisited = new boolean[matrix.length][matrix[0].length];
        for (int i = 0; i < matrix.length; i++) {
            for (int j = 0; j < matrix[0].length; j++) {
                isVisited[i][j] = false;
            }
        }
        helper(matrix, isVisited);
    }

    public void helper(boolean[][] matrix, boolean[][] isVisited) {
        
    }


    public static void main(String[] args) {
    }
}