import React, { Component } from "react"
import { StaticQuery, graphql } from "gatsby"

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faBriefcase,
  faCalendar,
  faTerminal,
  faGraduationCap,
  faUserGraduate,
  faCode,
} from "@fortawesome/free-solid-svg-icons"

export default class Content extends Component {
  render() {
    return (
      <StaticQuery
        query={graphql`
          query projectsQuery {
            allProjectsJson {
              edges {
                node {
                  project
                  link
                  description
                  language
                }
              }
            }
            allLanguagesJson {
              edges {
                node {
                  id
                  language
                }
              }
            }
          }
        `}
        render={data => (
          <>
            <section className="content" id="content">
              <div className="container">
                {/* + School subsection */}
                <div className="subsection">
                  <h2 className="mt-5">
                    <span className="dot"></span>What did I{" "}
                    <span className="word">study</span>?
                  </h2>
                  <div className="card">
                    <div className="card-body">
                      <div className="card-title">
                        <h3>ENS Paris-Saclay</h3>
                        <h4>
                          <FontAwesomeIcon
                            icon={faGraduationCap}
                            className="mr-2"
                          />
                          <a href="https://www.master-mva.com/">MSc in Mathematics, Vision, Learning (MVA)</a>
                        </h4>
                        <h4>
                          <FontAwesomeIcon
                            icon={faUserGraduate}
                            className="mr-2"
                          />{" "}
                          Sep. 2023 ‑ Current
                        </h4>
                      </div>

                      <div className="card-text">
                        <ul>
                          <li>World’s leading university in mathematics (<a href="https://www.shanghairanking.com/institution/paris-saclay-university">ARWU</a>)</li>
                          <li><strong>Courses (1<sup>st</sup> semester):</strong></li>
                          <ul>
                            <li>Advanced learning for text and graph data (M.VAZIRGIANNIS)</li>
                            <li>Convex optimization and applications in machine learning (A. D’ASPREMONT)</li>
                            <li>Geometric data analysis (J. FEYDY)</li>
                            <li>Introduction to probabilistic graphical models and deep generative models (P. LATOUCHE, P.A. MATTEI)</li>
                            <li>Learning for time series (L. OUDRE)</li>
                            <li>Object recognition and computer vision (G. VAROL, I. LAPTEV, J. PONCE)</li>
                          </ul>
                          <li><strong>Courses (2<sup>nd</sup> semester):</strong> to be coming...</li>
                          <li>Student representative</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-body">
                      <div className="card-title">
                        <h3>INSA Centre Val de Loire</h3>
                        <h4>
                          <FontAwesomeIcon
                            icon={faGraduationCap}
                            className="mr-2"
                          />
                          <a href="https://www.insa-centrevaldeloire.fr/fr/formation/maitrise-des-risques-industriels">MEng in Industrial Systems</a>
                        </h4>
                        <h4>
                          <FontAwesomeIcon
                            icon={faUserGraduate}
                            className="mr-2"
                          />{" "}
                          Sep. 2018 ‑ Sep. 2023
                        </h4>
                      </div>

                      <div className="card-text">
                        <ul>
                            <li><strong>Courses:</strong> statistical theory and methods, machine learning, computer vision, complex systems engineering, risk management (GPA: 4.0)</li>
                            <li>Student representative, active participation in various events (student council campaign, open days, etc.)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-body">
                      <div className="card-title">
                        <h3>University of Tours</h3>
                        <h4>
                          <FontAwesomeIcon
                            icon={faGraduationCap}
                            className="mr-2"
                          />
                          <a href="https://dept.phys.univ-tours.fr/formation/master-physique-appliquee-electronique-energie-electrique-automatique.html">MSc in Fundamental Physics and Applications</a>
                        </h4>
                        <h4>
                          <FontAwesomeIcon
                            icon={faUserGraduate}
                            className="mr-2"
                          />{" "}
                          Sep. 2022 ‑ Sep. 2023
                        </h4>
                      </div>

                      <div className="card-text">
                        <ul>
                          <li><strong>Courses:</strong> automatics, robotics, cyber‑physical system, multiphysics modelling</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-body">
                      <div className="card-title">
                        <h3>TalTech</h3>
                        <h4>
                          <FontAwesomeIcon
                            icon={faGraduationCap}
                            className="mr-2"
                          />
                          <a href="https://taltech.ee/en/school-of-information-technologies">School of Information Technologies (Erasmus+ exchange)</a>
                        </h4>
                        <h4>
                          <FontAwesomeIcon
                            icon={faUserGraduate}
                            className="mr-2"
                          />{" "}
                          Sep. 2021 ‑ Jan. 2022
                        </h4>
                      </div>

                      <div className="card-text">
                        <ul>
                          <li><strong>Courses:</strong> data mining, machine learning, system programming, embedded systems (GPA: 3.7)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                {/* - School subsection */}

                {/* + Job subsection */}
                <div className="subsection">
                  <h2>
                    <span className="dot"></span>What did I{" "}
                    <span className="word">do</span>?
                  </h2>

                  <div className="card">
                    <div className="card-body">
                      <div className="card-title">
                        <h3>Eviden</h3>
                        <h4>
                          <FontAwesomeIcon
                            icon={faBriefcase}
                            className="mr-2"
                          />{" "}
                          AI & Computer Vision Research Intern
                        </h4>
                        <h4>
                          <FontAwesomeIcon icon={faCalendar} className="mr-2" />{" "}
                          Feb. 2023 ‑ Aug. 2023
                        </h4>
                      </div>

                      <div className="card-text">
                        <ul>
                          <li>Big Data & Security division, European project <a href="https://prevent-pcp.eu/">PREVENT PCP</a></li>
                          <li>Detection of abandoned luggage in video streams to improve station safety and limit false alerts. <strong>Keywords:</strong> object detection, tracking, pose estimation, re‑identification</li>
                          <li>Implementation of score‑based object/owner association algorithms.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-body">
                      <div className="card-title">
                        <h3>MBDA</h3>
                        <h4>
                          <FontAwesomeIcon
                            icon={faBriefcase}
                            className="mr-2"
                          />{" "}
                          Embedded AI Intern
                        </h4>
                        <h4>
                          <FontAwesomeIcon icon={faCalendar} className="mr-2" />{" "}
                          Apr. 2022 ‑ Sep. 2022
                        </h4>
                      </div>

                      <div className="card-text">
                        <ul>
                          <li>Implementation of communication protocols, creation of an
                        embedded Linux image on a Xilinx Zynq card, setting up a Vitis
                        AI Docker environment, development of an image
                        classification model.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                {/* - Job subsection */}

                {/* + Technologies subsection */}
                <div className="subsection">
                  <h2 className="mt-5">
                    <span className="dot"></span>What do I{" "}
                    <span className="word">know</span>?
                  </h2>
                  <div className="row">
                    {data.allLanguagesJson.edges.map(({ node }, index) => (
                      <div className="col-lg-3 col-md-4 col-sm-6" key={index}>
                        <div className="card">
                          <div className="card-text">
                            <div className="card-item">
                              <FontAwesomeIcon
                                icon={faTerminal}
                                className="mr-2 item-icon"
                              />{" "}
                              {node.language}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* - Technologies subsection */}

                {/* + School subsection */}
                <div className="subsection">
                  <h2 className="mt-5">
                    <span className="dot"></span>What have I{" "}
                    <span className="word">experimented with</span>?
                  </h2>

                  <div className="card">
                    <div className="card-body">
                      <div className="card-title">
                        <h3>PRISME Laboratory</h3>
                        <h4>
                          <FontAwesomeIcon
                            icon={faGraduationCap}
                            className="mr-2"
                          />
                          Research project for medical applications
                        </h4>
                        <h4>
                          <FontAwesomeIcon
                            icon={faUserGraduate}
                            className="mr-2"
                          />{" "}
                           Feb. 2022 ‑ Apr. 2022 
                        </h4>
                      </div>

                      <div className="card-text">
                        <ul>
                          <li>Detection and tracking of micro‑scale magnetic robots on an ultrasound dataset. <strong>Keywords:</strong> YOLOv5, ECO tracker</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-body">
                      <div className="card-title">
                        <h3>TalTech Embedded AI Research Lab</h3>
                        <h4>
                          <FontAwesomeIcon
                            icon={faGraduationCap}
                            className="mr-2"
                          />
                          End of semester project
                        </h4>
                        <h4>
                          <FontAwesomeIcon
                            icon={faUserGraduate}
                            className="mr-2"
                          />{" "}
                          Nov. 2021 ‑ Jan. 2022 
                        </h4>
                      </div>

                      <div className="card-text">
                        <ul>
                          <li>Garage door cycle detection model from accelerometric dataset on an STM32 board with X‑CUBE‑AI. <strong>First prize 250€</strong></li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                {/* - School subsection */}

                {/* + Projects subsection */}
                {/* <div className="subsection">
                  <h2 className="mt-5">
                    <span className="dot"></span>What have I{" "}
                    <span className="word">experimented with</span>?
                  </h2>
                  <div className="row">
                    {data.allProjectsJson.edges.map(({ node }, index) => (
                      <div className="col-lg-4" key={index}>
                        <div className="card mb-4">
                          <div className="card-body">
                            <div className="card-title">
                              <h3>{node.project}</h3>
                              <h4>
                                <FontAwesomeIcon
                                  icon={faCode}
                                  className="mr-2"
                                />
                                {node.language}
                              </h4>
                            </div>

                            <div className="card-text">{node.description}</div>
                          </div>
                          <div className="card-footer">
                            <a
                              href={node.link}
                              target="_blank"
                              rel="noreferrer"
                            >
                              View
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div> */}
                {/* - Projects subsection */}
              </div>
            </section>
          </>
        )}
      />
    )
  }
}
