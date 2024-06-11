class ShopifyCart {
  constructor(domain, accessToken) {
    this.domain = domain;
    this.accessToken = accessToken;
    this.cartId = localStorage.getItem('shopifyCartId');
  }

  async createCart() {
    const query = `
      mutation {
        cartCreate {
          cart {
            id
          }
        }
      }
    `;
    const response = await this.fetchShopify(query);
    console.log(response.data);
    this.cartId = response.data.cartCreate.cart.id;
    localStorage.setItem('shopifyCartId', this.cartId);
  }

  async fetchShopify(query) {
    const response = await fetch(`https://${this.domain}/api/2023-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': this.accessToken,
      },
      body: JSON.stringify({ query }),
    });
    return response.json();
  }

  async addItem(variantId, quantity) {
    if (!this.cartId) await this.createCart();
    const query = `
      mutation {
        cartLinesAdd(cartId: "${this.cartId}", lines: [{ quantity: ${quantity}, merchandiseId: "${variantId}" }]) {
          cart {
            id
            lines(first: 10) {
              edges {
                node {
                  id
                  quantity
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      product {
                        title
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;
    const result = await this.fetchShopify(query);
    console.log(result.data);
    this.updateCartCount(result.data.cartLinesAdd.cart.lines.edges);
  }

  async removeItem(lineId) {
    const query = `
      mutation {
        cartLinesRemove(cartId: "${this.cartId}", lineIds: ["${lineId}"]) {
          cart {
            id
            lines(first: 10) {
              edges {
                node {
                  id
                  quantity
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      product {
                        title
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;
    const result = await this.fetchShopify(query);
    this.updateCartCount(result.data.cartLinesRemove.cart.lines.edges);
    return result.data.cartLinesRemove.cart.lines.edges;

  }

  async listItems() {
    if (!this.cartId) await this.createCart();
    const query = `
      query {
        cart(id: "${this.cartId}") {
          id
          lines(first: 10) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    image {
                      src
                    }
                    product {
                      title
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;
    return this.fetchShopify(query);
  }

  async getCheckoutUrl() {
    if (!this.cartId) await this.createCart();
    const query = `
      query {
        cart(id: "${this.cartId}") {
          checkoutUrl
        }
      }
    `;
    const response = await this.fetchShopify(query);
    return response.data.cart.checkoutUrl;
  }

  updateCartCount(lines) {
    const totalCount = lines.reduce((acc, line) => acc + line.node.quantity, 0);
    document.getElementById('cart-count').innerText = totalCount;
  }

  async updateItem(lineId, quantity) {
    const query = `
      mutation {
        cartLinesUpdate(cartId: "${this.cartId}", lines: [{id: "${lineId}", quantity: ${quantity}}]) {
          cart {
            id
            lines(first: 10) {
              edges {
                node {
                  id
                  quantity
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      product {
                        title
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;
    const result = await this.fetchShopify(query);
    this.updateCartCount(result.data.cartLinesUpdate.cart.lines.edges);
  }
}

const shopifyCart = new ShopifyCart('stoph-test.myshopify.com', '65ac516d072eb18a1c14b036aedbdb9f');

async function addToCart(variantId) {
  await shopifyCart.addItem(variantId, 1);
}

async function removeFromCart(lineId) {
  await shopifyCart.removeItem(lineId);
}

async function updateQuantity(lineId, quantity) {
  await shopifyCart.updateItem(lineId, quantity);
}

async function updateCartCount() {
  const cartItems = await shopifyCart.listItems();
  const totalCount = cartItems.data.cart.lines.edges.reduce((acc, line) => acc + line.node.quantity, 0);
  document.getElementById('cart-count').innerText = totalCount;
}