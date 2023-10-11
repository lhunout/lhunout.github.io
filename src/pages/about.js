import React from "react"
import SEO from "../components/seo"

import Layout from "../components/layout"
import Image from "../components/image"

const AboutPage = () => (
  <Layout>
    <SEO title="About" />
    <section className="about">
      <div className="container">
        {/* + Title */}
        <div className="row mt-4 justify-content-center">
          <div className="col-lg-7 col-sm-12 my-auto headline">
            <h1>My mini autobiography</h1>
          </div>
        </div>
        {/* - Title */}

        <div className="row my-4 justify-content-center">
          {/* + Card */}
          <div className="col-lg-7 my-auto">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="card-title">
                  <h2>
                    Hi there!
                    <span role="img" aria-label="Happy face">
                      😊
                    </span>
                  </h2>
                  <h3>an introduction</h3>
                </div>

                <div className="card-text">
                  <p>Originally from Normandy, I recently began a new chapter in my life in the Parisian region, after studying for five years in the Centre region of France. As part of this exciting journey, I am pursuing a Master's degree in Mathematics, Vision, Learning (MVA), a program renowned for its excellence in artificial intelligence.</p>
                  <p>I am passionate about data science and machine learning, with over two years of experience specializing in Python development and algorithms. I adapt quickly and have a strong aptitude for collaboration. Motivated and persevering, I enjoy working on diverse projects to further develop my skills. </p>
                  <p>I am actively seeking a research intern position, preferably within a private laboratory in a tech company or startup. However, I am also open to opportunities with academic laboratories. I am ready to embrace the future challenges that come my way.</p>
                </div>
              </div>
            </div>
          </div>
          {/* - Card */}

          {/* + Image */}
          {/* <div className="col-lg-6 my-auto mx-auto">
            <Image
              fileName="photo.jpg"
              alt="About page"
              className="about-img-wrapper"
            />
          </div> */}
          {/* - Image */}

          {/* + Card */}
          {/* <div className="col-lg-7 my-auto">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="card-title">
                  <h2>More about me</h2>
                  <h3>sweet and sweeter</h3>
                </div>

                <div className="card-text">
                  Bonbon chocolate bar ice cream brownie ice cream macaroon
                  halvah. Toffee tart chupa chups ice cream croissant jujubes
                  lollipop. Dragée jelly beans sesame snaps wafer muffin sesame
                  snaps topping bonbon ice cream. Macaroon cake biscuit gummies
                  sweet sweet chocolate cake. Danish sweet roll carrot cake
                  croissant. Donut chocolate cake jelly beans.
                </div>
              </div>
            </div>
          </div> */}
          {/* - Card */}
        </div>
      </div>
    </section>
  </Layout>
)
export default AboutPage
